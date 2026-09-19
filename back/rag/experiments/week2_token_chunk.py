import os

from dotenv import load_dotenv
from google import genai

from rag.experiments.week2_pdf_layout import extract_rows


load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def count_tokens(text):
    response = client.models.count_tokens(
        model="gemini-3.6-flash",
        contents=text,
    )

    return response.total_tokens


def row_to_text(row):
    return (
        f"Mã ngành: {row['ma']}. "
        f"Tên ngành: {row['ten']}. "
        f"Chỉ tiêu: {row['chi_tieu']}. "
        f"Tổ hợp: {row['to_hop']}."
    )


def chunk_by_tokens(rows, max_tokens=400, overlap_rows=1):
    chunks = []
    current_rows = []

    for row in rows:
        candidate_rows = current_rows + [row]

        candidate_text = "\n".join(
            row_to_text(r)
            for r in candidate_rows
        )

        token_count = count_tokens(candidate_text)

        if token_count > max_tokens and current_rows:
            # Lưu chunk hiện tại
            chunks.append(current_rows)

            # Giữ lại row cuối làm overlap
            current_rows = current_rows[-overlap_rows:]

            # Thêm row hiện tại vào chunk mới
            current_rows.append(row)

        else:
            current_rows.append(row)

    # Lưu chunk cuối
    if current_rows:
        chunks.append(current_rows)

    return chunks


# =========================
# Main
# =========================

pdf_path = "../document/danh_muc_nganh_CTU_2026.pdf"

rows = extract_rows(pdf_path)

print("Rows total:", len(rows))


chunks = chunk_by_tokens(
    rows,
    max_tokens=400,
    overlap_rows=1
)


print("Chunks total:", len(chunks))


for index, chunk_rows in enumerate(chunks):

    chunk_text = "\n".join(
        row_to_text(row)
        for row in chunk_rows
    )

    print(f"\n--- CHUNK {index + 1} ---")

    print("Số row:", len(chunk_rows))

    print(
        "Số token:",
        count_tokens(chunk_text)
    )

    print(chunk_text)