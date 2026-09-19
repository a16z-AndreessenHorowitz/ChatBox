import os

import numpy as np
from google import genai

from database.connection import get_connection
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

load_dotenv()

client=genai.Client(
  api_key=os.getenv("GEMINI_API_KEY"),
)

def get_embedding(text):
  response = client.models.embed_content(
    model="gemini-embedding-001",
    contents=text,
  )

  return np.array(response.embeddings[0].values)

def search_similar_chunks(query, top_k=3):
  query_vector = get_embedding(query)
  conn=get_connection()
  register_vector(conn)

  cursor=conn.cursor()
  cursor.execute(
    """
      select
      id, content, embedding <=> %s as distance
      from document_chunks
      order by embedding <=> %s
      limit %s
    """, (query_vector, query_vector, top_k)
  )

  result= cursor.fetchall()
  cursor.close()
  conn.close()
  return result
