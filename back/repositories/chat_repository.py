from uuid import UUID
from database.connection import get_connection


def create_chat_session(user_id=None, title=None) -> UUID:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO chat_sessions (user_id, title)
        VALUES (%s, %s)
        RETURNING id
        """,
        (user_id, title),
      )
      session_id = cursor.fetchone()[0]
    connection.commit()
  return session_id


def save_chat_message(
  session_id: UUID,
  role: str,
  content: str,
  sources=None,
  response_time_ms=None,
) -> None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO chat_messages (
          session_id,
          role,
          content,
          sources,
          response_time_ms
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
          session_id,
          role,
          content,
          sources,
          response_time_ms,
        ),
      )
      cursor.execute(
        """
        UPDATE chat_sessions
        SET updated_at = NOW()
        WHERE id = %s
        """,
        (session_id,),
      )
    connection.commit()


def get_chat_history(session_id: UUID) -> list[dict]:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT
          id,
          role,
          content,
          sources,
          response_time_ms,
          feedback,
          feedback_comment,
          created_at
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY created_at ASC
        """,
        (session_id,),
      )
      rows = cursor.fetchall()

  messages = []
  for row in rows:
    messages.append({
      "id": row[0],
      "role": row[1],
      "content": row[2],
      "sources": row[3],
      "response_time_ms": row[4],
      "feedback": row[5],
      "feedback_comment": row[6],
      "created_at": row[7],
    })
  return messages


def get_chat_session(session_id: UUID) -> dict | None:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT id, user_id, title, is_active, created_at, updated_at
        FROM chat_sessions
        WHERE id = %s
        """,
        (session_id,),
      )
      row = cursor.fetchone()
      if not row:
        return None
      return {
        "id": row[0],
        "user_id": row[1],
        "title": row[2],
        "is_active": row[3],
        "created_at": row[4],
        "updated_at": row[5],
      }


def get_all_chat_sessions(user_id: int) -> list[dict]:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        WHERE is_active = TRUE AND user_id = %s
        ORDER BY updated_at DESC
        """,
        (user_id,),
      )
      rows = cursor.fetchall()

  sessions = []
  for row in rows:
    sessions.append({
      "id": row[0],
      "title": row[1],
      "created_at": row[2],
      "updated_at": row[3],
    })
  return sessions

