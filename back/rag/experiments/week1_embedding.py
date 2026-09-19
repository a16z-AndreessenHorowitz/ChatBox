import os
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
  raise ValueError("GOOGLE_API_KEY environment variable is not set.")

client=genai.Client(api_key=api_key)

def get_embedding(text):
  response=client.models.embed_content(
  model="gemini-embedding-001",
  contents=text,
  )
  return response.embeddings[0].values

def cosine_similarity(vector_a, vector_b):
  a = np.array(vector_a)
  b = np.array(vector_b)

  return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


sentence_1 = "Học phí ngành CNTT là bao nhiêu?"
sentence_2 = "Chi phí học ngành Công nghệ thông tin bao nhiêu?"
sentence_3 = "Hôm nay thời tiết rất đẹp."
sentence_4 = "Học phí ngành Kỹ thuật phần mềm là bao nhiêu?"
sentence_5 = "Điều kiện xét tuyển ngành CNTT là gì?"

embedding_1 = get_embedding(sentence_1)
embedding_2 = get_embedding(sentence_2)
embedding_3 = get_embedding(sentence_3)
embedding_4 = get_embedding(sentence_4)
embedding_5 = get_embedding(sentence_5)

print("1 ↔ 2:", cosine_similarity(embedding_1, embedding_2))
print("1 ↔ 3:", cosine_similarity(embedding_1, embedding_3))
print("1 ↔ 4:", cosine_similarity(embedding_1, embedding_4))
print("1 ↔ 5:", cosine_similarity(embedding_1, embedding_5))