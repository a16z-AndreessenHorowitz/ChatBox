import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"].strip()

GEMINI_CHAT_MODELS = list(dict.fromkeys([
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
]))

if not GEMINI_API_KEY:
  raise ValueError("GEMINI_API_KEY chưa được cấu hình")
