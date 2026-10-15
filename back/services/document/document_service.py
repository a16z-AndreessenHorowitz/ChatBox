from fastapi import BackgroundTasks
from repositories.document_repository import (
  create_document_metadata as repository_create_document_metadata,
  get_document_by_id,
  update_document_category,
  update_document_markdown,
)
from repositories.chunk_repository import replace_document_chunks
from services.document.chunking_service import process_markdown_chunking
from services.document.embedding_service import add_embeddings_to_chunks
from services.document.extraction_service import classify_document_category, extract_document
from services.storage.base import StorageServiceError
from services.storage.factory import get_storage_service

def create_document_metadata(user_id: int, metadata: dict, background_tasks: BackgroundTasks = None) ->dict:
  if not get_storage_service().file_exists(metadata["public_id"]):
    raise StorageServiceError("File chưa tồn tại trên Cloudflare R2.", status_code=400)

  metadata["status"]= "UPLOADED"
  metadata["category"] = "Chưa xác định"

  #Lưu metadata  vào DB  và lấy dict thông tin chứa id
  doc = repository_create_document_metadata(user_id, metadata)
  document_id = doc["id"]

  #Xử lý kích hoạt job
  if background_tasks:
    background_tasks.add_task(extract_document, document_id)
  else:
    extract_document(document_id)

  return doc


def get_document_detail(document_id: int) -> dict:
  doc = get_document_by_id(document_id)
  if not doc:
    raise StorageServiceError("Không tìm thấy tài liệu.", status_code=404)
  return doc


def update_document_markdown_content(document_id: int, markdown_content: str) -> dict:
  doc = get_document_by_id(document_id)
  if not doc:
    raise StorageServiceError("Không tìm thấy tài liệu.", status_code=404)

  update_document_markdown(document_id, markdown_content)
  category = classify_document_category(markdown_content, doc.get("original_filename") or "")
  update_document_category(document_id, category)

  base_metadata = {
    "document_id": document_id,
    "original_filename": doc.get("original_filename"),
    "category": category,
    "file_type": (doc.get("original_filename", "").rsplit(".", 1)[-1].lower()
                  if "." in doc.get("original_filename", "") else None),
  }
  chunks = process_markdown_chunking(markdown_content, base_metadata)
  add_embeddings_to_chunks(chunks)

  replace_document_chunks(document_id, chunks)

  doc["markdown_content"] = markdown_content
  doc["category"] = category
  return doc
