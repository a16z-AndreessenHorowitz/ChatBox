
import pymupdf

pdf_path="../document/danh_muc_nganh_CTU_2026.pdf"

doc=pymupdf.open(pdf_path)

lines=[]

for page in doc:
  text = page.get_text()

  for line in text.splitlines():
    line=line.strip()

    if line:
      lines.append(line)

doc.close()

records=[]
start_index=None
for i in range(len(lines)-1):
  if lines[i] == "1" and lines[i+1] == "7140201":
    start_index=i
    break

if start_index is None:
    raise ValueError("Không tìm thấy dòng bắt đầu của bảng")

i=start_index
while i+4 <len(lines):
  stt=lines[i]
  code=lines[i+1]
  name = lines[i + 2]
  quota = lines[i + 3]
  combinations = lines[i + 4]

  records.append({
    "stt": stt,
    "code": code,
    "name": name,
    "quota": quota,
    "combinations": combinations,
  })
  i+=5

for record in records[:10]:
  print(record)




