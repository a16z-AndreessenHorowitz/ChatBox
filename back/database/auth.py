import psycopg

from database.connection import DatabaseConnectionError, get_connection

# Biến này dùng để ghi nhớ xem database auth đã được khởi tạo trong lần chạy app này chưa.
_auth_database_initialized = False


def initialize_auth_database():
  # Bạn đang muốn thay đổi biến _auth_database_initialized nằm bên ngoài function.
  global _auth_database_initialized

  if _auth_database_initialized:
    return

  try:
    with get_connection() as connection:
      # cursor là thứ dùng để gửi SQL tới database.
      with connection.cursor() as cursor:
        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            account TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL DEFAULT 'user',
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          """
        )

        cursor.execute(
          "CREATE UNIQUE INDEX IF NOT EXISTS users_account_unique ON users (account)"
        )

        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS otp_challenges (
            account TEXT PRIMARY KEY,
            code_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
          )
          """
        )

        cursor.execute(
          """
          CREATE TABLE IF NOT EXISTS verification_tokens (
            token TEXT PRIMARY KEY,
            account TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
          )
          """
        )
        # các câu lệnh được thực hiện trong transaction.
        # commit xác nhận và lưu các thay đổi vào database.
      connection.commit()
    _auth_database_initialized = True
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể khởi tạo bảng auth trong PostgreSQL."
    ) from error
