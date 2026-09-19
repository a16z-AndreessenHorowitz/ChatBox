from pathlib import Path

from back.rag.experiments.week1_embedding import get_embedding

file_path = Path("../document/school.txt")
text = file_path.read_text(encoding="utf-8")
print(text)

# chunk_size=100
# overlap=20
#
# chunks=[]
#
# for i in range(0, len(text), chunk_size - overlap):
#     chunk= text[i:i+chunk_size]
#     chunks.append(chunk)
#
# for index, chunk in enumerate(chunks):
#     print(f"\n--- Chunk {index} ---")
#     print(chunk)

sentences = text.strip().split('.')

sentences = [
    sentence.strip()
    for sentence in sentences
    if sentence.strip()
]

chunk_size=100
overlap=1

chunks=[]
current_chunk = []
current_length = 0

for sentence in sentences:
    setence_length = len(sentence)

    if current_length + setence_length > chunk_size:
        chunks.append(". ".join(current_chunk)+".")

        # lấy phần tử ở cuối
        current_chunk = current_chunk[-overlap:]
        current_length = sum(len(s) for s in current_chunk)

    current_chunk.append(sentence)
    current_length += setence_length

# lưu vào danh sách cuối cùng nếu vẫn còn curent_chunk
if current_chunk:
    chunks.append(". ".join(current_chunk)+".")

for index, chunk in enumerate(chunks):
    vector=get_embedding(chunk)
    print(f"\n--- Chunk {index} ---")
    print("Nội dung:", chunk)
    print("Số chiều:", len(vector))























