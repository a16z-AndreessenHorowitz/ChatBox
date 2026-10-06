from services.storage.factory import get_storage_service

from repositories.document_repository import (
  get_recent_documents as repository_get_recent_documents,
)

def create_upload_credentials(upload_request: dict) -> dict:
  return get_storage_service().create_upload_credentials(
    original_filename=upload_request["original_filename"],
    content_type=upload_request.get("content_type") or "application/octet-stream",
    file_size=upload_request["file_size"],
  )

def get_recent_documents(user_id: int):
  return repository_get_recent_documents(user_id)
