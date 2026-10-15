from typing import List, Dict, Any

from psycopg.types.json import Jsonb

from database.connection import get_connection


def _format_pgvector(vector: List[float] | None) -> str | None:
    if vector is None:
        return None
    return "[" + ",".join(str(value) for value in vector) + "]"


def replace_document_chunks(document_id: int, chunks: List[Dict[str, Any]]) -> int:
    """
    Xóa sạch các chunks cũ của document_id và chèn toàn bộ chunks mới (Atomic/Transaction).
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM document_chunks WHERE document_id = %s",
                (document_id,),
            )

            if chunks:
                cursor.executemany(
                    """
                    INSERT INTO document_chunks (
                        document_id, chunk_index, content, metadata, embedding
                    )
                    VALUES (%s, %s, %s, %s, %s::vector)
                    """,
                    [
                        (
                            document_id,
                            chunk["chunk_index"],
                            chunk["content"],
                            Jsonb(chunk.get("metadata", {})),
                            _format_pgvector(chunk.get("embedding")),
                        )
                        for chunk in chunks
                    ],
                )
        connection.commit()

    return len(chunks)
