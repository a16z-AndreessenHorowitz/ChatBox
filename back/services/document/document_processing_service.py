import tempfile
import requests
import time
import traceback
from pathlib import Path

import re
import ftfy

from docling.document_converter import DocumentConverter
from docling.datamodel.pipeline_options import PdfPipelineOptions


from repositories.document_repository import (
    get_document_by_id,
    update_document_status,
)

# Cấu hình giới hạn
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE = 1024 * 1024           # 1 MB (Tải từng MB để tiết kiệm RAM)
MAX_RETRIES = 3


def clean_extracted_markdown(markdown_text: str) -> str:
    """Tầng làm sạch dữ liệu (Post-processing) dành cho RAG:

    - Lọc bỏ các thẻ rác do Docling sinh ra từ ảnh/mộc đỏ
    - Chuẩn hóa khoảng trắng và sửa một số lỗi dính chữ tiếng Việt phổ biến
    """
    if not markdown_text:
        return ""

    text = ftfy.fix_text(markdown_text)  # Sửa lỗi dính chữ tiếng Việt phổ biến

    # Xóa các thẻ HTML comment dạng <!-- image --> do Docling chèn vào khi gặp mộc đỏ/logo
    text = re.sub(r"<!--\s*image\s*-->", "", markdown_text)

    # Xóa các khoảng trắng thừa ở cuối mỗi dòng
    text = re.sub(r"[ \t]+\n", "\n", text)

    # Xóa các dòng trống thừa mứa (giữ tối đa 2 dòng trống liên tiếp)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()  # Xóa khoảng trắng đầu/cuối


def get_configured_docling_converter() -> DocumentConverter:
    """Khởi tạo DocumentConverter với cấu hình TableFormer nâng cao."""
    pipeline_options = PdfPipelineOptions()

    # Bật tính năng phân tích cấu trúc bảng chuyên sâu (TableFormer)
    pipeline_options.do_tablestructure = True

    # Giữ OCR để hỗ trợ bóc tách chữ từ ảnh/vùng scan
    pipeline_options.do_ocr = True

    # Đưa cấu hình vào converter
    return DocumentConverter(
        pipeline_options=pipeline_options
    )


def download_remote_file(secure_url: str, temp_file_obj):
    for attempt in range(1, MAX_RETRIES +1):
        try:
            with requests.get(secure_url, stream=True, timeout=(5, 60)) as response:
                response.raise_for_status()

                content_length = response.headers.get('Content-Length')
                if content_length and int(content_length) > MAX_FILE_SIZE:
                    raise ValueError(f"File quá lớn: {content_length} bytes. Giới hạn là {MAX_FILE_SIZE} bytes.")

                downloaded_size = 0
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        downloaded_size += len(chunk)
                        if downloaded_size > MAX_FILE_SIZE:
                            raise ValueError(f"File quá lớn trong quá trình tải: {downloaded_size} bytes. Giới hạn là {MAX_FILE_SIZE} bytes.")
                        temp_file_obj.write(chunk)

                temp_file_obj.flush()  
                # Đảm bảo dữ liệu được ghi vào file tạm
                return 
                # Nếu tải thành công, thoát khỏi hàm
        except (requests.RequestException, ValueError) as e:
            if attempt == MAX_RETRIES:
                raise  Exception(f"Lỗi tải file sau {MAX_RETRIES} lần thử: {str(e)}")
            time.sleep(2 ** attempt)  # Đợi 2s, 4s, 8s rồi thử lại

def processing_document(document_id: int):
    try:
        # Lấy thông tin file metadata từ database
        doc=get_document_by_id(document_id)
        if not doc:
            print(f"Không tìm thấy tài liệu với ID: {document_id}")
            return
        update_document_status(document_id, status="PROCESSING")
        secure_url = doc["secure_url"]
        suffix = Path(doc.get("original_filename") or "").suffix or ".pdf"

        #Xử lý file và trích xuất bằng Docling
        with tempfile.NamedTemporaryFile(mode="wb", suffix=suffix, delete=True) as temp_pdf:
            print(f"[Worker] Đang tải file ID {document_id} từ storage...")
            download_remote_file(secure_url, temp_pdf)

            print(f"[Worker] Đang trích xuất nội dung ID {document_id} bằng Docling...")
            converter=DocumentConverter()
            result=converter.convert(temp_pdf.name)

            # Lấy nội dung dạng markdown ( giữ nguyên cấu trúc bảng biểu)
            raw_extracted_content = result.document.export_to_markdown()
        # Gọi hàm làm sạch để lọc bỏ thẻ <!-- image --> và dòng trống
        extracted_content = clean_extracted_markdown(raw_extracted_content)

        with open(f"test_doc_{document_id}.md", "w", encoding="utf-8") as f:
            f.write(extracted_content)

        print(f"[Worker] Đã xuất file test_doc_{document_id}.md thành công!")

        # Thành công 
        update_document_status(document_id, status="READY")
        print(f"[Worker] Hoàn tất xử lý document_id: {document_id}")

    except ValueError as ve:
        error_message = str(ve)
        print(f"[Worker] Validation Error ID {document_id}: {error_message}")
        update_document_status(document_id, status="FAILED", error_message=error_message)
    except Exception as e:
        error_message = f"Lỗi hệ thống: {str(e)}"
        print(f"[Worker] Exception ID {document_id}:\n{traceback.format_exc()}")
        update_document_status(document_id, status="FAILED", error_message=error_message)


        
