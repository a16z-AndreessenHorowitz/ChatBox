import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"].strip()

GEMINI_CHAT_MODELS = list(dict.fromkeys([
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
]))

if not GEMINI_API_KEY:
  raise ValueError("GEMINI_API_KEY chưa được cấu hình")
