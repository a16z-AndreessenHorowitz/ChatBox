import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_GEMINI_DOCUMENT_MODELS = (
    "gemini-3.8-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite"
)


def _parse_model_list(value: str) -> list[str]:
    return [model.strip() for model in value.split(",") if model.strip()]


def _unique_model_list(models: list[str]) -> list[str]:
    return list(dict.fromkeys(models))


GEMINI_DOCUMENT_MODELS = _unique_model_list(
    _parse_model_list(
        os.getenv("GEMINI_DOCUMENT_MODELS") or DEFAULT_GEMINI_DOCUMENT_MODELS
    )
)
