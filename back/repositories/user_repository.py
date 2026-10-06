from __future__ import annotations
from datetime import datetime
from database.connection import get_connection


def user_exists(account: str) -> bool:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute("SELECT 1 FROM users WHERE account = %s", (account,))
      return cursor.fetchone() is not None


def get_user_by_account(account: str) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT id, password_hash, role FROM users WHERE account = %s",
        (account,),
      )
      row = cursor.fetchone()
      if row is None:
        return None
      return {
        "id": row[0],
        "password_hash": row[1],
        "role": row[2],
      }


def get_user_id_by_account(account: str) -> int | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT id FROM users WHERE account = %s",
        (account,),
      )
      row = cursor.fetchone()
      return row[0] if row else None


def create_user(account: str, password_hash: str) -> int:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "INSERT INTO users (account, password_hash) VALUES (%s, %s) RETURNING id",
        (account, password_hash),
      )
      user_id = cursor.fetchone()[0]
    connection.commit()
    return user_id


def upsert_otp_challenge(account: str, code_hash: str, expires_at: float) -> None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO otp_challenges (account, code_hash, expires_at)
        VALUES (%s, %s, TO_TIMESTAMP(%s))
        ON CONFLICT (account) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          expires_at = EXCLUDED.expires_at
        """,
        (account, code_hash, expires_at),
      )
    connection.commit()


def get_otp_challenge(account: str) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT code_hash, expires_at FROM otp_challenges WHERE account = %s",
        (account,),
      )
      row = cursor.fetchone()
      if row is None:
        return None
      return {
        "code_hash": row[0],
        "expires_at": row[1],
      }


def delete_otp_challenge(account: str) -> None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "DELETE FROM otp_challenges WHERE account = %s",
        (account,),
      )
    connection.commit()


def save_verification_token(token: str, account: str, expires_at: datetime) -> None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "INSERT INTO verification_tokens (token, account, expires_at) VALUES (%s, %s, %s)",
        (token, account, expires_at),
      )
    connection.commit()


def get_verification_token(token: str) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT account, expires_at FROM verification_tokens WHERE token = %s",
        (token,),
      )
      row = cursor.fetchone()
      if row is None:
        return None
      return {
        "account": row[0],
        "expires_at": row[1],
      }


def delete_verification_token(token: str) -> None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "DELETE FROM verification_tokens WHERE token = %s",
        (token,),
      )
    connection.commit()
