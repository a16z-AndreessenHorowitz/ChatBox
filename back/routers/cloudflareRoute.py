from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, status, BackgroundTasks, UploadFile

from services.document.document_service import create_document_metadata
from services.auth_service import get_current_user
from services.cloudflare import (
  create_upload_credentials,
  get_recent_documents as service_get_recent_documents,
)
from services.storage.base import StorageServiceError
from services.storage.factory import get_storage_service
from schemas.document_schema import DocumentMetadata, UploadSignatureRequest

router = APIRouter(prefix="/documents", tags=["Documents"])
MAX_UPLOAD_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"}

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
  if current_user.get("role", "user").lower() == "user":
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền tải tài liệu lên.")
  return current_user

# xin quyền upload 
@router.post("/upload/signature")
async def create_upload_signature(
  upload_request: UploadSignatureRequest,
  _: dict = Depends(require_admin),
):
  try:
    values = upload_request.model_dump() if hasattr(upload_request, "model_dump") else upload_request.dict()
    return create_upload_credentials(values)
  except StorageServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message) from error


#lưu thông tin file
@router.post("/upload/metadata", status_code=status.HTTP_201_CREATED)
async def save_upload_metadata(
  metadata: DocumentMetadata,
  background_tasks: BackgroundTasks,
  current_user: dict = Depends(require_admin),
):
  try:
    user_id = int(current_user["sub"])
    values = metadata.model_dump() if hasattr(metadata, "model_dump") else metadata.dict()
    return create_document_metadata(user_id, values, background_tasks=background_tasks)
  except (KeyError, TypeError, ValueError) as error:
    raise HTTPException(status_code=401, detail="Token không hợp lệ.") from error
  except StorageServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document_via_backend(
  background_tasks: BackgroundTasks,
  file: UploadFile = File(...),
  current_user: dict = Depends(require_admin),
):
  suffix = Path(file.filename or "").suffix.lower()
  if suffix not in ALLOWED_EXTENSIONS:
    raise HTTPException(status_code=400, detail="Định dạng file chưa được hỗ trợ.")

  destination_name = f"documents/{uuid4().hex}{suffix}"
  storage_service = get_storage_service()
  uploaded_size = 0

  try:
    user_id = int(current_user["sub"])
  except (KeyError, TypeError, ValueError) as error:
    raise HTTPException(status_code=401, detail="Token không hợp lệ.") from error

  try:
    with NamedTemporaryFile(mode="wb", suffix=suffix, delete=True) as temp_file:
      while chunk := await file.read(1024 * 1024):
        uploaded_size += len(chunk)
        if uploaded_size > MAX_UPLOAD_SIZE:
          raise HTTPException(status_code=400, detail="File vượt quá giới hạn 50MB.")
        temp_file.write(chunk)
      temp_file.flush()

      secure_url = storage_service.upload_file(temp_file.name, destination_name)
      if not secure_url:
        raise StorageServiceError("Upload Cloudflare R2 thất bại.", status_code=502)

    metadata = {
      "public_id": destination_name,
      "secure_url": secure_url,
      "original_filename": file.filename or destination_name,
      "file_size": uploaded_size,
    }
    return create_document_metadata(user_id, metadata, background_tasks=background_tasks)
  except StorageServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message) from error
  finally:
    await file.close()


@router.get("/recent")
async def get_recent_documents(current_user: dict = Depends(require_admin)):
  try:
    user_id = int(current_user["sub"])
  except (KeyError, TypeError, ValueError) as error:
    raise HTTPException(status_code=401, detail="Token không hợp lệ.") from error
  return service_get_recent_documents(user_id)
