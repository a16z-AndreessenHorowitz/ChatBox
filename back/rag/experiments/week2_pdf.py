import fitz

pdf_path="../document/danh_muc_nganh_CTU_2026.pdf"

doc=fitz.open(pdf_path)

full_text=""
for page_number, page in enumerate(doc, start=1):
  text= page.get_text()
  print(f"Da doc trang {page_number}")
  full_text += text + "/n"

doc.close()

print("\n===== TOÀN BỘ TEXT =====")
print(full_text)