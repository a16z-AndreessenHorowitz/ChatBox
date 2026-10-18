import os
import tempfile
import time
import traceback
from pathlib import Path

import requests
from google import genai
from google.genai.errors import ClientError, ServerError

from core.chat import GEMINI_API_KEY
from repositories.document_repository import (
    get_document_by_id,
    update_document_category,
    update_document_markdown,
    update_document_status,
)
from repositories.chunk_repository import save_document_chunks

from services.document.chunking_service import process_markdown_chunking
from services.document.embedding_service import add_embeddings_to_chunks

MAX_FILE_SIZE = 50 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024
MAX_RETRIES = 3


def parse_model_list(value: str) -> list[str]:
    return [model.strip() for model in value.split(",") if model.strip()]


def unique_model_list(models: list[str]) -> list[str]:
    unique_models = []
    seen = set()
    for model in models:
        if model not in seen:
            unique_models.append(model)
            seen.add(model)
    return unique_models


GEMINI_DOCUMENT_MODELS = unique_model_list(
    parse_model_list(os.getenv("GEMINI_DOCUMENT_MODELS", ""))
)

client = genai.Client(api_key=GEMINI_API_KEY)

DOCUMENT_CATEGORIES = [
    "Điểm chuẩn",
    "Phương thức xét tuyển",
    "Chỉ tiêu tuyển sinh",
    "Học phí",
    "Học bổng",
    "Ngành đào tạo",
    "Thông báo tuyển sinh",
    "Quy chế tuyển sinh",
    "Khác",
]

EXTRACTION_PROMPT = """Bạn là chuyên gia trích xuất dữ liệu tài liệu tuyển sinh.
Hãy trích xuất toàn bộ nội dung tài liệu này sang định dạng Markdown:
- Giữ nguyên cấu trúc bảng biểu dưới dạng bảng Markdown chuẩn.
- Bảo đảm đầy đủ các thông tin tuyển sinh như mã ngành, tên ngành, điểm chuẩn, phương thức xét tuyển nếu có.
- Bỏ qua hình ảnh con dấu, chữ ký, watermark hoặc phần trang trí không chứa thông tin.
- Trả về kết quả thuần Markdown, không bọc trong ```markdown."""


# làm sạch Markdown được trích xuất từ Gemini, loại bỏ các ký tự ```markdown và ``` thừa
def clean_extracted_markdown(markdown_text: str) -> str:
    if not markdown_text:
        return ""

    text = markdown_text.replace("```markdown", "").replace("```", "")
    return text.strip()

# nhận biết xem một ngoại lệ (Exception) có phải do Gemini Service bị gỡ/quá tải/ngưng phục vụ hay không
def is_gemini_unavailable_error(error: Exception) -> bool:
    error_text = str(error).lower()
    return (
        getattr(error, "status_code", None) == 503
        or "503" in error_text
        or "unavailable" in error_text
        or "high demand" in error_text
    )

# nhận biết xem một ngoại lệ (Exception) có phải do model Gemini không khả dụng với tài khoản/API hay không
def is_gemini_model_not_found_error(error: Exception) -> bool:
    error_text = str(error).lower()
    return (
        getattr(error, "status_code", None) == 404
        or "404" in error_text
        or "not_found" in error_text
        or "no longer available" in error_text
    )


def generate_content_with_model_fallback(contents, task_label: str):
    last_error = None

    #  Thử từng model trong GEMINI_DOCUMENT_MODELS, nếu model đầu tiên thất bại thì chuyển sang model tiếp theo
    for model_index, model in enumerate(GEMINI_DOCUMENT_MODELS, start=1):
        # Thử nhiều lần với từng model, nếu gặp lỗi tạm thời (503, quá tải) thì thử lại với backoff
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(
                    f"[Worker] Gemini {task_label} model "
                    f"{model_index}/{len(GEMINI_DOCUMENT_MODELS)} "
                    f"attempt {attempt}/{MAX_RETRIES}: {model}"
                )
                return client.models.generate_content(
                    model=model,
                    contents=contents,
                )
            except ServerError as error:
                last_error = error
                status_code = getattr(error, "status_code", None)
                print(
                    f"[Worker] Gemini ServerError khi {task_label} "
                    f"model={model} attempt {attempt}/{MAX_RETRIES}: "
                    f"{status_code} {error}"
                )

                if is_gemini_unavailable_error(error):
                    if attempt < MAX_RETRIES:
                        time.sleep(2 ** attempt)
                        continue
                    print(
                        f"[Worker] Model {model} đang quá tải, "
                        "chuyển sang model fallback nếu có..."
                    )
                    break

                if attempt == MAX_RETRIES:
                    raise
                time.sleep(2 ** attempt)
            except ClientError as error:
                last_error = error
                status_code = getattr(error, "status_code", None)
                print(
                    f"[Worker] Gemini ClientError khi {task_label} "
                    f"model={model}: {status_code} {error}"
                )
                # Nếu model không khả dụng với tài khoản/API, thì chuyển sang model tiếp theo break để tránh tốn thời gian
                if is_gemini_model_not_found_error(error):
                    print(
                        f"[Worker] Model {model} không khả dụng với tài khoản/API này, "
                        "chuyển sang model fallback nếu có..."
                    )
                    break

                raise
            except Exception as error:
                last_error = error
                print(
                    f"[Worker] Lỗi Gemini khi {task_label} "
                    f"model={model} attempt {attempt}/{MAX_RETRIES}: {error}"
                )
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(2 ** attempt)

    if last_error and is_gemini_unavailable_error(last_error):
        raise ValueError(
            "Tất cả model Gemini đang quá tải hoặc tạm thời không khả dụng. "
            "Vui lòng thử lại sau."
        ) from last_error
    if last_error and is_gemini_model_not_found_error(last_error):
        raise ValueError(
            "Các model Gemini đang cấu hình không khả dụng với tài khoản/API này. "
            "Vui lòng kiểm tra lại GEMINI_DOCUMENT_MODELS trong .env."
        ) from last_error

    raise ValueError("Không có model Gemini khả dụng để xử lý tài liệu.")

# chuẩn hoá danh mục tài liệu, loại bỏ các ký tự thừa và so sánh không phân biệt hoa thường
def normalize_document_category(category_text: str) -> str:
    if not category_text:
        return "Khác"

    cleaned_text = (
        category_text.replace("```", "")
        .replace('"', "")
        .replace("'", "")
        .strip()
    )
    cleaned_lower = cleaned_text.lower()

    for category in DOCUMENT_CATEGORIES:
        if cleaned_lower == category.lower():
            return category

    for category in DOCUMENT_CATEGORIES:
        if category.lower() in cleaned_lower:
            return category

    return "Khác"


#phân loại danh mục tài liệu tuyển sinh dựa trên phương pháp tìm kiếm từ khóa cục bộ (Rule-based / Keyword Matching)
def classify_document_category_locally(
    markdown_content: str,
    original_filename: str = "",
) -> str:
    text = f"{original_filename}\n{markdown_content[:5000]}".lower()
    keyword_map = [
        ("Điểm chuẩn", ["điểm chuẩn", "trúng tuyển", "điểm trúng tuyển"]),
        (
            "Phương thức xét tuyển",
            ["phương thức xét tuyển", "xét tuyển", "tổ hợp xét tuyển"],
        ),
        ("Chỉ tiêu tuyển sinh", ["chỉ tiêu", "tuyển sinh"]),
        ("Học phí", ["học phí", "lệ phí"]),
        ("Học bổng", ["học bổng"]),
        ("Ngành đào tạo", ["ngành đào tạo", "mã ngành", "chương trình đào tạo"]),
        ("Thông báo tuyển sinh", ["thông báo tuyển sinh", "đề án tuyển sinh"]),
        ("Quy chế tuyển sinh", ["quy chế", "quy định tuyển sinh"]),
    ]

    for category, keywords in keyword_map:
        if any(keyword in text for keyword in keywords):
            return category

    return "Khác"


def classify_document_category(markdown_content: str, original_filename: str = "") -> str:
    if not markdown_content.strip() and not original_filename.strip():
        return "Khác"

    local_category = classify_document_category_locally(
        markdown_content,
        original_filename,
    )
    if local_category != "Khác":
        print(f"[Worker] Phân loại local: {local_category}")
        return local_category

    categories_text = "\n".join(f"- {category}" for category in DOCUMENT_CATEGORIES)
    content_preview = markdown_content[:12000]
    prompt = f"""Bạn là hệ thống phân loại tài liệu tuyển sinh.
Hãy chọn đúng 1 category trong danh sách sau:
{categories_text}

Tên file: {original_filename or "Không có"}

Nội dung tài liệu:
{content_preview}

Chỉ trả về đúng tên category, không giải thích."""

    response = generate_content_with_model_fallback(
        contents=prompt,
        task_label="classify",
    )
    return normalize_document_category(response.text or "")


def download_remote_file(secure_url: str, temp_file_obj):
    # Tải file từ secure_url về temp_file_obj, kiểm tra kích thước file và retry nếu gặp lỗi tạm thời
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with requests.get(secure_url, stream=True, timeout=(5, 60)) as response:
                response.raise_for_status()
                
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > MAX_FILE_SIZE:
                    raise ValueError(
                        f"File quá lớn: {content_length} bytes. Giới hạn là {MAX_FILE_SIZE} bytes."
                    )

                downloaded_size = 0
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        downloaded_size += len(chunk)
                        if downloaded_size > MAX_FILE_SIZE:
                            raise ValueError(
                                f"File quá lớn trong quá trình tải: {downloaded_size} bytes. Giới hạn là {MAX_FILE_SIZE} bytes."
                            )
                        temp_file_obj.write(chunk)

                temp_file_obj.flush()
                return
        except (requests.RequestException, ValueError) as error:
            if attempt == MAX_RETRIES:
                raise Exception(f"Lỗi tải file sau {MAX_RETRIES} lần thử: {str(error)}") from error
            time.sleep(2 ** attempt)


def extract_markdown_with_gemini(file_path: str) -> str:
    gemini_file = None
    try:
        gemini_file = client.files.upload(file=file_path)
        response = generate_content_with_model_fallback(
            contents=[gemini_file, EXTRACTION_PROMPT],
            task_label="extract",
        )
        return clean_extracted_markdown(response.text or "")
    finally:
        if gemini_file:
            client.files.delete(name=gemini_file.name)

def extract_document(document_id: int):
    try:
        doc = get_document_by_id(document_id)
        if not doc:
            print(f"Không tìm thấy tài liệu với ID: {document_id}")
            return

        update_document_status(document_id, status="PROCESSING")

        secure_url = doc["secure_url"]
        suffix = Path(doc.get("original_filename") or "").suffix or ".pdf"

        with tempfile.NamedTemporaryFile(mode="wb", suffix=suffix, delete=True) as temp_file:
            print(f"[Worker] Đang tải file ID {document_id} từ storage...")
            download_remote_file(secure_url, temp_file)

            print(f"[Worker] Đang trích xuất Markdown ID {document_id} bằng Gemini...")
            extracted_markdown = extract_markdown_with_gemini(temp_file.name)

        print(
            f"[Worker] Đã trích xuất Markdown ID {document_id}: "
            f"{len(extracted_markdown or '')} ký tự"
        )
        if not extracted_markdown or not extracted_markdown.strip():
            print(f"[Worker] Cảnh báo: Markdown ID {document_id} đang rỗng sau khi extract.")

        update_document_markdown(document_id, extracted_markdown)

        print(f"[Worker] Đang phân loại document_id {document_id}...")
        try:
            category = classify_document_category(
                extracted_markdown,
                doc.get("original_filename") or "",
            )
        except Exception as error:
            category = "Khác"
            print(
                f"[Worker] Không phân loại được bằng Gemini cho document_id {document_id}, "
                f"dùng category mặc định '{category}': {error}"
            )
        update_document_category(document_id, category)
        print(f"[Worker] Đã phân loại document_id {document_id}: {category}")

        base_metadata = {
            "document_id": document_id,
            "original_filename": doc.get("original_filename"),
            "file_type": suffix.lstrip(".").lower(),
            "category": category,
        }
        
        print(f"[Worker] Đang chia chunks cho document_id {document_id}...")
        chunks = process_markdown_chunking(extracted_markdown, base_metadata)
        print(f"[Worker] Đã tạo {len(chunks)} chunks cho document_id {document_id}")

        print(f"[Worker] Đang tạo embeddings cho {len(chunks)} chunks document_id {document_id}...")
        add_embeddings_to_chunks(chunks)
        print(f"[Worker] Đã tạo embeddings cho document_id {document_id}")

        print(f"[Worker] Đang lưu chunks cho document_id {document_id}...")
        saved_chunk_count = save_document_chunks(document_id, chunks)
        print(f"[Worker] Đã lưu thành công {saved_chunk_count} chunks cho document_id: {document_id}")

        
        update_document_status(document_id, status="READY")
        print(f"[Worker] Hoàn tất xử lý document_id: {document_id}")

    except ValueError as error:
        error_message = str(error)
        print(f"[Worker] Validation Error ID {document_id}: {error_message}")
        update_document_status(document_id, status="FAILED", error_message=error_message)
    except Exception as error:
        error_message = f"Lỗi hệ thống: {str(error)}"
        print(f"[Worker] Exception ID {document_id}:\n{traceback.format_exc()}")
        update_document_status(document_id, status="FAILED", error_message=error_message)
