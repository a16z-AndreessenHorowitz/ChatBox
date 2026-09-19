from urllib.parse import uses_relative
from database.connection import get_connection, DatabaseConnectionError
from database.chat import initialize_chat_database

def _get_connection():
    try:
        initialize_chat_database()
        return get_connection()
    except DatabaseConnectionError as error:
        raise Exception(f"Chat DB Error: {error}") from error

def create_chat_session(user_id=None, title=None):
		with _get_connection() as connection:
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
		session_id, role, content, sources=None, response_time_ms=None,
):
		with _get_connection() as connection:
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

def get_chat_history(session_id):
		with _get_connection() as connection:
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

		return rows

def get_all_chat_sessions():
		with _get_connection() as connection:
				with connection.cursor() as cursor:
						cursor.execute(
								"""
								SELECT id, title, created_at, updated_at
								FROM chat_sessions
								WHERE is_active = TRUE
								ORDER BY updated_at DESC
								"""
						)
						rows = cursor.fetchall()
		return rows