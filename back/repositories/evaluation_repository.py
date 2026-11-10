from typing import Any
from database.connection import get_connection
from psycopg.types.json import Jsonb


def _format_pgvector(vector: list[float] | None) -> str | None:
  if vector is None:
    return None
  return "[" + ",".join(str(value) for value in vector) + "]"


def _parse_pgvector(val: Any) -> list[float] | None:
  if val is None:
    return None
  if isinstance(val, (list, tuple)):
    return [float(x) for x in val]
  if isinstance(val, str):
    cleaned = val.strip("[]() \n")
    if not cleaned:
      return None
    return [float(x) for x in cleaned.split(",")]
  return None


def list_ready_documents() -> list[dict]:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT id, original_filename, created_at
        FROM documents
        WHERE status = 'READY'
        ORDER BY created_at DESC, id DESC
        """
      )
      rows = cursor.fetchall()
  return [
    {
      "id": row[0],
      "original_filename": row[1],
      "status": "READY",
      "created_at": row[2].isoformat(),
    }
    for row in rows
  ]


def get_ready_document_chunks(document_id: int) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT d.original_filename, c.id, c.chunk_index, c.content
        FROM documents d
        LEFT JOIN document_chunks c ON c.document_id = d.id
        WHERE d.id = %s AND d.status = 'READY'
        ORDER BY c.chunk_index
        """,
        (document_id,),
      )
      rows = cursor.fetchall()

  if not rows:
    return None
  return {
    "name": rows[0][0],
    "chunks": [
      {"id": row[1], "index": row[2], "content": row[3]}
      for row in rows if row[1] is not None
    ],
  }


def create_draft_questions(
  document_id: int,
  created_by: int,
  candidates: list[dict],
) -> list[dict]:
  created_ids = []
  with get_connection() as connection:
    with connection.cursor() as cursor:
      for candidate in candidates:
        cursor.execute(
          """
          INSERT INTO evaluation_questions (
            question, expected_answer, source_document_id, status, created_by
          )
          VALUES (%s, %s, %s, 'draft', %s)
          RETURNING id, question, expected_answer, source_document_id,
                    status, created_by, reviewed_by, created_at, updated_at, approved_at
          """,
          (candidate["question"], candidate["expected_answer"], document_id, created_by),
        )
        row = cursor.fetchone()
        question_id = row[0]
        chunk_ids = candidate["source_chunk_ids"]
        if chunk_ids:
          cursor.executemany(
            """
            INSERT INTO evaluation_question_sources (question_id, chunk_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            [(question_id, chunk_id) for chunk_id in chunk_ids],
          )
        created_ids.append(question_id)
    connection.commit()
  return [question for question_id in created_ids if (question := get_question(question_id))]


def list_questions(status_filter: str | None = None) -> list[dict]:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      query = """
        SELECT q.id, q.question, q.expected_answer, q.source_document_id,
               q.status, q.created_by, q.reviewed_by, q.created_at,
               q.updated_at, q.approved_at, d.original_filename
        FROM evaluation_questions q
        LEFT JOIN documents d ON d.id = q.source_document_id
      """
      params = ()
      if status_filter:
        query += " WHERE q.status = %s"
        params = (status_filter,)
      query += " ORDER BY q.created_at DESC, q.id DESC"
      cursor.execute(query, params)
      rows = cursor.fetchall()
      question_ids = [row[0] for row in rows]
      sources_by_question = _get_question_sources(cursor, question_ids, include_content=False)
  return [_question_row_to_dict(row[:10], sources_by_question.get(row[0], []), row[10]) for row in rows]


def get_question(question_id: int) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT q.id, q.question, q.expected_answer, q.source_document_id,
               q.status, q.created_by, q.reviewed_by, q.created_at,
               q.updated_at, q.approved_at, d.original_filename
        FROM evaluation_questions q
        LEFT JOIN documents d ON d.id = q.source_document_id
        WHERE q.id = %s
        """,
        (question_id,),
      )
      row = cursor.fetchone()
      if not row:
        return None
      sources = _get_question_sources(cursor, [question_id]).get(question_id, [])
  return _question_row_to_dict(row[:10], sources, row[10])


def update_question(question_id: int, question: str, expected_answer: str | None) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        UPDATE evaluation_questions
        SET question = %s, expected_answer = %s, updated_at = NOW()
        WHERE id = %s AND status = 'draft'
        RETURNING id, question, expected_answer, source_document_id,
                  status, created_by, reviewed_by, created_at, updated_at, approved_at
        """,
        (question.strip(), expected_answer.strip() if expected_answer else None, question_id),
      )
      row = cursor.fetchone()
      if not row:
        return None
      cursor.execute(
        """
        SELECT d.original_filename
        FROM evaluation_questions q
        LEFT JOIN documents d ON d.id = q.source_document_id
        WHERE q.id = %s
        """,
        (question_id,),
      )
      document = cursor.fetchone()
      sources = _get_question_sources(cursor, [question_id]).get(question_id, [])
    connection.commit()
  return _question_row_to_dict(row, sources, document[0] if document else None)


def approve_question(
  question_id: int,
  reviewed_by: int,
  embedding: list[float] | None = None,
) -> dict | None:
  formatted_vector = _format_pgvector(embedding)
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        UPDATE evaluation_questions
        SET status = 'approved', reviewed_by = %s,
            embedding = COALESCE(%s::vector, embedding),
            approved_at = NOW(), updated_at = NOW()
        WHERE id = %s AND status = 'draft'
          AND expected_answer IS NOT NULL
          AND length(btrim(expected_answer)) > 0
        RETURNING id, question, expected_answer, source_document_id,
                  status, created_by, reviewed_by, created_at, updated_at, approved_at
        """,
        (reviewed_by, formatted_vector, question_id),
      )
      row = cursor.fetchone()
      if not row:
        return None
      cursor.execute(
        """
        SELECT d.original_filename
        FROM evaluation_questions q
        LEFT JOIN documents d ON d.id = q.source_document_id
        WHERE q.id = %s
        """,
        (question_id,),
      )
      document = cursor.fetchone()
      sources = _get_question_sources(cursor, [question_id]).get(question_id, [])
    connection.commit()
  return _question_row_to_dict(row, sources, document[0] if document else None)


def delete_question(question_id: int) -> bool:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "DELETE FROM evaluation_questions WHERE id = %s AND status = 'draft'",
        (question_id,),
      )
      deleted = cursor.rowcount > 0
    connection.commit()
  return deleted


def create_evaluation_run(created_by: int, config: dict | None = None) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT id FROM evaluation_questions WHERE status = 'approved' ORDER BY id"
      )
      question_ids = [row[0] for row in cursor.fetchall()]
      if not question_ids:
        return None
      cursor.execute(
        """
        INSERT INTO evaluation_runs (status, total_questions, config, created_by)
        VALUES ('queued', %s, %s, %s)
        RETURNING id, status, total_questions, created_at
        """,
        (len(question_ids), Jsonb(config or {}), created_by),
      )
      row = cursor.fetchone()
    connection.commit()
  return {
    "id": row[0],
    "status": row[1],
    "total_questions": row[2],
    "created_at": row[3].isoformat(),
    "question_ids": question_ids,
  }


def get_approved_questions(question_ids: list[int]) -> list[dict]:
  if not question_ids:
    return []
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT id, question, expected_answer, embedding
        FROM evaluation_questions
        WHERE id = ANY(%s) AND status = 'approved'
        ORDER BY id
        """,
        (question_ids,),
      )
      rows = cursor.fetchall()
  return [
    {
      "id": row[0],
      "question": row[1],
      "expected_answer": row[2],
      "embedding": _parse_pgvector(row[3]),
    }
    for row in rows
  ]


def set_evaluation_run_status(run_id: int, status: str, error_message: str | None = None):
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        UPDATE evaluation_runs
        SET status = %s,
            error_message = %s,
            started_at = CASE WHEN %s = 'running' THEN NOW() ELSE started_at END,
            completed_at = CASE
              WHEN %s IN ('completed', 'completed_with_errors', 'failed') THEN NOW()
              ELSE completed_at
            END
        WHERE id = %s
        """,
        (status, error_message, status, status, run_id),
      )
    connection.commit()


def save_evaluation_result(
  run_id: int,
  question_id: int,
  *,
  answer: str | None = None,
  retrieved_contexts: list[dict] | None = None,
  faithfulness_score: float | None = None,
  correctness_score: float | None = None,
  retrieval_score: float | None = None,
  reasons: dict | None = None,
  error_message: str | None = None,
  response_time_ms: int | None = None,
):
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO evaluation_results (
          run_id, question_id, status, answer, retrieved_contexts,
          faithfulness_score, correctness_score, retrieval_score,
          reasons, error_message, response_time_ms
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (run_id, question_id) DO UPDATE SET
          status = EXCLUDED.status,
          answer = EXCLUDED.answer,
          retrieved_contexts = EXCLUDED.retrieved_contexts,
          faithfulness_score = EXCLUDED.faithfulness_score,
          correctness_score = EXCLUDED.correctness_score,
          retrieval_score = EXCLUDED.retrieval_score,
          reasons = EXCLUDED.reasons,
          error_message = EXCLUDED.error_message,
          response_time_ms = EXCLUDED.response_time_ms
        """,
        (
          run_id,
          question_id,
          "failed" if error_message else "completed",
          answer,
          Jsonb(retrieved_contexts or []),
          faithfulness_score,
          correctness_score,
          retrieval_score,
          Jsonb(reasons or {}),
          error_message,
          response_time_ms,
        ),
      )
    connection.commit()


def list_evaluation_runs(limit: int = 30) -> list[dict]:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT r.id, r.status, r.total_questions, r.created_at, r.started_at,
               r.completed_at, r.error_message,
               COUNT(e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
               COUNT(e.id) FILTER (WHERE e.status = 'failed') AS failed_count,
               AVG(e.faithfulness_score), AVG(e.correctness_score), AVG(e.retrieval_score)
        FROM evaluation_runs r
        LEFT JOIN evaluation_results e ON e.run_id = r.id
        GROUP BY r.id
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT %s
        """,
        (limit,),
      )
      rows = cursor.fetchall()
  return [_run_row_to_dict(row) for row in rows]


def get_evaluation_run(run_id: int) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT r.id, r.status, r.total_questions, r.created_at, r.started_at,
               r.completed_at, r.error_message,
               COUNT(e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
               COUNT(e.id) FILTER (WHERE e.status = 'failed') AS failed_count,
               AVG(e.faithfulness_score), AVG(e.correctness_score), AVG(e.retrieval_score)
        FROM evaluation_runs r
        LEFT JOIN evaluation_results e ON e.run_id = r.id
        WHERE r.id = %s
        GROUP BY r.id
        """,
        (run_id,),
      )
      row = cursor.fetchone()
      if not row:
        return None
      run = _run_row_to_dict(row)
      cursor.execute(
        """
        SELECT e.id, e.question_id, q.question, q.expected_answer, e.status,
               e.answer, e.retrieved_contexts, e.faithfulness_score,
               e.correctness_score, e.retrieval_score, e.reasons,
               e.error_message, e.response_time_ms
        FROM evaluation_results e
        JOIN evaluation_questions q ON q.id = e.question_id
        WHERE e.run_id = %s
        ORDER BY e.id
        """,
        (run_id,),
      )
      rows = cursor.fetchall()
  run["results"] = [
    {
      "id": item[0],
      "question_id": item[1],
      "question": item[2],
      "expected_answer": item[3],
      "status": item[4],
      "answer": item[5],
      "retrieved_contexts": item[6] or [],
      "faithfulness_score": item[7],
      "correctness_score": item[8],
      "retrieval_score": item[9],
      "reasons": item[10] or {},
      "error_message": item[11],
      "response_time_ms": item[12],
    }
    for item in rows
  ]
  return run


def _run_row_to_dict(row: tuple) -> dict:
  return {
    "id": row[0],
    "status": row[1],
    "total_questions": row[2],
    "created_at": row[3].isoformat() if row[3] else None,
    "started_at": row[4].isoformat() if row[4] else None,
    "completed_at": row[5].isoformat() if row[5] else None,
    "error_message": row[6],
    "completed_count": row[7],
    "failed_count": row[8],
    "average_scores": {
      "faithfulness": float(row[9]) if row[9] is not None else None,
      "correctness": float(row[10]) if row[10] is not None else None,
      "retrieval": float(row[11]) if row[11] is not None else None,
    },
  }


def _get_question_sources(
  cursor,
  question_ids: list[int],
  include_content: bool = True,
) -> dict[int, list[dict]]:
  if not question_ids:
    return {}
  content_column = "c.content" if include_content else "NULL::text"
  cursor.execute(
    f"""
    SELECT s.question_id, c.id, c.chunk_index, {content_column}, d.id, d.original_filename
    FROM evaluation_question_sources s
    JOIN document_chunks c ON c.id = s.chunk_id
    JOIN documents d ON d.id = c.document_id
    WHERE s.question_id = ANY(%s)
    ORDER BY s.question_id, c.chunk_index
    """,
    (question_ids,),
  )
  sources: dict[int, list[dict]] = {}
  for question_id, chunk_id, chunk_index, content, document_id, document_name in cursor.fetchall():
    sources.setdefault(question_id, []).append({
      "chunk_id": chunk_id,
      "chunk_index": chunk_index,
      "content": content,
      "document_id": document_id,
      "document_name": document_name,
    })
  return sources


def _question_row_to_dict(row, sources: list[dict], document_name: str | None) -> dict:
  return {
    "id": row[0],
    "question": row[1],
    "expected_answer": row[2],
    "source_document_id": row[3],
    "status": row[4],
    "created_by": row[5],
    "reviewed_by": row[6],
    "created_at": row[7].isoformat() if row[7] else None,
    "updated_at": row[8].isoformat() if row[8] else None,
    "approved_at": row[9].isoformat() if row[9] else None,
    "source_document_name": document_name,
    "sources": sources,
  }
