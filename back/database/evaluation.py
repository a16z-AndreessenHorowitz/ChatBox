import psycopg

from database.connection import DatabaseConnectionError, get_connection

_evaluation_database_initialized = False


def initialize_evaluation_database():
  """Create the RAG evaluation question bank and its chunk source links."""
  global _evaluation_database_initialized

  if _evaluation_database_initialized:
    return

  try:
    with get_connection() as connection:
      with connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS evaluation_questions (
            id BIGSERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            expected_answer TEXT,
            source_document_id BIGINT REFERENCES documents (id) ON DELETE SET NULL,
            status TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'approved')),
            created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
            reviewed_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
            embedding VECTOR(384),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            approved_at TIMESTAMPTZ,
            CHECK (
              status <> 'approved'
              OR (expected_answer IS NOT NULL AND length(btrim(expected_answer)) > 0)
            )
          )
          """
        )
        cursor.execute(
          """
          ALTER TABLE evaluation_questions
          ADD COLUMN IF NOT EXISTS embedding VECTOR(384);
          """
        )
        cursor.execute(
          """
          CREATE INDEX IF NOT EXISTS evaluation_questions_status_created_idx
          ON evaluation_questions (status, created_at DESC)
          """
        )
        cursor.execute(
          """
          CREATE INDEX IF NOT EXISTS evaluation_questions_source_document_idx
          ON evaluation_questions (source_document_id)
          """
        )
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS evaluation_question_sources (
            question_id BIGINT NOT NULL
              REFERENCES evaluation_questions (id) ON DELETE CASCADE,
            chunk_id BIGINT NOT NULL
              REFERENCES document_chunks (id) ON DELETE CASCADE,
            PRIMARY KEY (question_id, chunk_id)
          )
          """
        )
        cursor.execute(
          """
          CREATE INDEX IF NOT EXISTS evaluation_question_sources_chunk_idx
          ON evaluation_question_sources (chunk_id)
          """
        )
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS evaluation_runs (
            id BIGSERIAL PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued', 'running', 'completed', 'completed_with_errors', 'failed')),
            total_questions INTEGER NOT NULL DEFAULT 0,
            config JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT,
            created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ
          )
          """
        )
        cursor.execute(
          """
          CREATE INDEX IF NOT EXISTS evaluation_runs_created_at_idx
          ON evaluation_runs (created_at DESC)
          """
        )
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS evaluation_results (
            id BIGSERIAL PRIMARY KEY,
            run_id BIGINT NOT NULL REFERENCES evaluation_runs (id) ON DELETE CASCADE,
            question_id BIGINT NOT NULL REFERENCES evaluation_questions (id) ON DELETE RESTRICT,
            status TEXT NOT NULL DEFAULT 'completed'
              CHECK (status IN ('completed', 'failed')),
            answer TEXT,
            retrieved_contexts JSONB NOT NULL DEFAULT '[]'::jsonb,
            faithfulness_score DOUBLE PRECISION,
            correctness_score DOUBLE PRECISION,
            retrieval_score DOUBLE PRECISION,
            reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT,
            response_time_ms INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (run_id, question_id),
            CHECK (faithfulness_score IS NULL OR faithfulness_score BETWEEN 0 AND 1),
            CHECK (correctness_score IS NULL OR correctness_score BETWEEN 0 AND 1),
            CHECK (retrieval_score IS NULL OR retrieval_score BETWEEN 0 AND 1)
          )
          """
        )
        cursor.execute(
          """
          CREATE INDEX IF NOT EXISTS evaluation_results_run_idx
          ON evaluation_results (run_id, id)
          """
        )
      connection.commit()
    _evaluation_database_initialized = True
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể khởi tạo bảng đánh giá RAG trong PostgreSQL."
    ) from error
