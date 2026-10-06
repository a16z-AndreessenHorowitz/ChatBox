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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          """
        )
        cursor.execute(
          "CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents (user_id)"
        )
      connection.commit()
    _document_database_initialized = True
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể khởi tạo bảng documents trong PostgreSQL."
    ) from error
