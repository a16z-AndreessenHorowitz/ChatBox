import os
from pathlib import Path

from dotenv import load_dotenv

# Ưu tiên back/.env để load cấu hình
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

# Các biến cấu hình Cloudflare R2
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")  # Hoặc lấy trực tiếp từ R2_ENDPOINT_URL
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "rag-tuyen-sinh").strip() or "rag-tuyen-sinh"
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN")

# Đổi provider mặc định sang r2
STORAGE_PROVIDER = os.getenv(
    "STORAGE_PROVIDER",
    "r2",
).strip().lower()


def r2_is_configured() -> bool:
    """Kiểm tra xem hệ thống đã điền đủ cấu hình Cloudflare R2 hay chưa"""
    return bool(
        R2_ENDPOINT_URL
        and R2_ACCESS_KEY_ID
        and R2_SECRET_ACCESS_KEY
        and R2_BUCKET_NAME
        and R2_PUBLIC_DOMAIN
    )