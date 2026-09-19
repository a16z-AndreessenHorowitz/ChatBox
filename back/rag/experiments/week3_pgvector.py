import psycopg2
import os
import numpy as np
from pgvector.psycopg2 import register_vector
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from database.connection import get_connection

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def get_embedding(text):
    response=client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return np.array(response.embeddings[0].values)


file_path = Path("../document/school.txt")
text = file_path.read_text(encoding="utf-8")

print("Đã đọc file")
print(text)

sentences= text.split(".")

sentences= [
    sentence.strip()
    for sentence in sentences
    if sentence.strip()
]

chunk_size=100
overlap=1

chunks=[]
current_chunk=[]
current_length=0

for sentence in sentences:
    sentence_length = len(sentence)

    if current_length + sentence_length > chunk_size:
        chunks.append(". ".join(current_chunk))

        current_chunk = current_chunk[-overlap:]
        current_length = sum(len(s) for s in current_chunk)

    current_chunk.append(sentence)
    current_length += sentence_length


if current_chunk:
    chunks.append(". ".join(current_chunk))


print(f"\nTổng số chunks: {len(chunks)}")





conn = get_connection()
register_vector(conn)
cursor = conn.cursor()

for index, chunk in enumerate(chunks):

    print(f"\nĐang xử lý chunk {index}...")
    print(chunk)

    vector = get_embedding(chunk)

    cursor.execute(
        """
        INSERT INTO document_chunks (
            content,
            embedding
        )
        VALUES (%s, %s)
        """,
        (chunk, vector),
    )

    print("Đã lưu!")

conn.commit()
cursor.close()
conn.close()





