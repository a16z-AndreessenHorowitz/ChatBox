from rag.retriever import search_similar_chunks

query = "Học phí ngành Công nghệ thông tin bao nhiêu?"
result = search_similar_chunks(query, top_k=3)

print("Câu hỏi:",query)

for index,row in enumerate(result, start=1):
  chunk_id, content, distance = row

  print(f"\n--- Result {index} ---")
  print("ID:", chunk_id)
  print("Distance:", distance)
  print("Content:", content)
