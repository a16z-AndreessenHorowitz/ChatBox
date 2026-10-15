import psycopg

from database.connection import DatabaseConnectionError, get_connection

_document_database_initialized = False


def initialize_document_database():
  global _document_database_initialized
  if _document_database_initialized:
    return

  try:
    with get_connection() as connection:
      with connection.cursor() as cursor:
        # Kích hoạt extension pgvector
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS documents (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users (id),
            public_id TEXT NOT NULL UNIQUE,
            secure_url TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_size bigint NOT NULL,
            status text NOT NULL,
            category text NOT NULL,
            error_message text,
            markdown_content text,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          """
        )
        cursor.execute(
          "CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents (user_id)"
        )
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS document_chunks (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            embedding VECTOR(384),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (document_id, chunk_index)
          )
          """
        )
        cursor.execute(
          "CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id)"
        )
        # 4. (Tùy chọn nâng cao) Tạo HNSW Index giúp tìm kiếm Vector siêu tốc khi dữ liệu lớn
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
            ON document_chunks USING hnsw (embedding vector_cosine_ops);
            """
        )
      connection.commit()
    _document_database_initialized = True
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể khởi tạo bảng documents trong PostgreSQL."
    ) from error
