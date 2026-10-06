from database.connection import get_connection


def create_document_metadata(user_id: int, metadata: dict) -> dict:
  with get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO documents (
          user_id, public_id, secure_url, original_filename, file_size, status, category
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, user_id, public_id, secure_url, original_filename, file_size, status, category, created_at
        """,
        (
          user_id,
          metadata["public_id"],
          metadata["secure_url"],
          metadata["original_filename"],
          metadata["file_size"],
          metadata["status"],
          metadata["category"],
        ),
      )
      row = cursor.fetchone()
    connection.commit()

  return {
      "id": row[0],
      "user_id": row[1],
      "public_id": row[2],
      "secure_url": row[3],
      "original_filename": row[4],
      "file_size": row[5],
      "status": row[6],
      "category": row[7],
      "created_at": row[8],
  }

def get_recent_documents(user_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    original_filename,
                    secure_url,
                    file_size,
                    category,
                    status,
                    created_at
                FROM documents
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (user_id,),
            )

            rows = cursor.fetchall()

    return [
        {
            "id": row[0],
            "original_filename": row[1],
            "secure_url": row[2],
            "file_size": row[3],
            "category": row[4],
            "status": row[5],
            "created_at": row[6],
        }
        for row in rows
    ]

def get_document_by_id(document_id: int) -> dict:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    id, 
                    secure_url,
                    status,
                    original_filename
                FROM documents 
                WHERE id = %s
                """, 
                (document_id,)
            )
            row = cursor.fetchone()
            
    if row:
        return {
            "id": row[0],
            "secure_url": row[1],
            "status": row[2],
            "original_filename": row[3]
        }
    return None

def update_document_status(document_id: int, status: str, error_message: str = None) -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            # Nếu có truyền error_message (trường hợp FAILED)
            if error_message is not None:
                cursor.execute(
                    """
                    UPDATE documents 
                    SET status = %s, error_message = %s
                    WHERE id = %s
                    """,
                    (status, error_message, document_id)
                )
            # Trường hợp chỉ cập nhật trạng thái bình thường (PROCESSING, READY)
            else:
                cursor.execute(
                    """
                    UPDATE documents 
                    SET status = %s
                    WHERE id = %s
                    """,
                    (status, document_id)
                )
        connection.commit()
