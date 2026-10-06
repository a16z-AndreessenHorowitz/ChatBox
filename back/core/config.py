import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "cloudinary").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "TS").strip()

OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
VERIFICATION_TTL_SECONDS = int(os.getenv("VERIFICATION_TTL_SECONDS", "900"))

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "7fK3mQ9xV2pL8nR4sT6wY1zA5cD8eG0hJ3kN6uP9xB2vM7qR4sL8").strip()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "72000"))
