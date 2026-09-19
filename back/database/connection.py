import psycopg

from core.config import DATABASE_URL


class DatabaseConnectionError(Exception):
  pass


def get_connection():
  if not DATABASE_URL:
    raise DatabaseConnectionError("Thiếu DATABASE_URL trong file back/.env.")

  try:
    return psycopg.connect(DATABASE_URL)
  except psycopg.Error as error:
    raise DatabaseConnectionError(
      "Không thể kết nối PostgreSQL. Kiểm tra DATABASE_URL và trạng thái database."
    ) from error
