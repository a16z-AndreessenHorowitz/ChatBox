
import os
from dotenv import load_dotenv
from google import genai
import pymupdf


load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

pdf_path="../document/danh_muc_nganh_CTU_2026.pdf"

doc=pymupdf.open(pdf_path)
text=""

for page in doc:
  text+=page.get_text()

doc.close()

response = client.models.count_tokens(
    model="gemini-3.6-flash",
    contents=text,
)

print("Số ký tự:", len(text))
print("Số từ:", len(text.split()))
print("Số token:", response.total_tokens)












