import psycopg

from database.connection import DatabaseConnectionError, get_connection

# Biến này dùng để ghi nhớ xem database chat đã được khởi tạo trong lần chạy app này chưa.
_chat_database_initialized = False


def initialize_chat_database():
  # Bạn đang muốn thay đổi biến _chat_database_initialized nằm bên ngoài function.
  global _chat_database_initialized

  if _chat_database_initialized:
    return

  try:
    with get_connection() as connection:
      # cursor là thứ dùng để gửi SQL tới database.
      with connection.cursor() as cursor:
        cursor.execute(
          """
          CREATE EXTENSION IF NOT EXISTS pgcrypto
          """
        )

        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id BIGINT REFERENCES users (id),
            title TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          """
        )

        cursor.execute(
          "CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions (user_id)"
        )

        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
            content TEXT NOT NULL,
            sources JSONB,
            response_time_ms INTEGER,
            feedback SMALLINT,
            feedback_comment TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          """
        )

        cursor.execute(
          "CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages (session_id)"
        )
        # các câu lệnh được thực hiện trong transaction.
        # commit xác nhận và lưu các thay đổi vào database.
      connection.commit()
    _chat_database_initialized = True
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể khởi tạo bảng chat trong PostgreSQL."
    ) from error