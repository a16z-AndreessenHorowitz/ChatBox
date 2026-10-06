from fastapi import BackgroundTasks
from repositories.document_repository import (
  create_document_metadata as repository_create_document_metadata
)
from services.document.document_processing_service import processing_document
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
    background_tasks.add_task(processing_document, document_id)
  else:
    processing_document(document_id)

  return doc
