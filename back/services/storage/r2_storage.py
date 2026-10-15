import uuid
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from services.storage.base import BaseStorage, StorageServiceError


MAX_UPLOAD_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"}
DEFAULT_CONTENT_TYPE = "application/octet-stream"


class R2Storage(BaseStorage):
    def __init__(
        self,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
        public_domain: str,
    ):
        self.bucket_name = bucket_name
        self.public_domain = public_domain.rstrip("/")

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    def create_upload_credentials(
        self,
        original_filename: str,
        content_type: str,
        file_size: int,
    ) -> dict:
        if file_size <= 0 or file_size > MAX_UPLOAD_SIZE:
            raise StorageServiceError("File vượt quá giới hạn 50MB.", status_code=400)

        suffix = Path(original_filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise StorageServiceError("Định dạng file chưa được hỗ trợ.", status_code=400)

        upload_content_type = content_type or DEFAULT_CONTENT_TYPE
        object_key = f"documents/{uuid.uuid4().hex}{suffix}"
        public_url = f"{self.public_domain}/{object_key}"

        try:
            presigned_url = self.s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": object_key,
                    "ContentType": upload_content_type,
                },
                ExpiresIn=600,
            )
        except ClientError as error:
            raise StorageServiceError(
                "Không thể tạo thông tin upload Cloudflare R2.",
                status_code=502,
            ) from error

        return {
            "upload_url": presigned_url,
            "method": "PUT",
            "headers": {
                "Content-Type": upload_content_type,
            },
            "metadata": {
                "public_id": object_key,
                "secure_url": public_url,
            },
        }

    def file_exists(self, destination_name: str) -> bool:
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=destination_name,
            )
            return True
        except ClientError as error:
            status_code = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if status_code == 404:
                return False
            raise StorageServiceError(
                "Không thể kiểm tra file trên Cloudflare R2.",
                status_code=502,
            ) from error

    def upload_file(self, file_path: str, destination_name: str) -> str:
        try:
            extra_args = {}
            if destination_name.lower().endswith(".pdf"):
                extra_args["ContentType"] = "application/pdf"

            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                destination_name,
                ExtraArgs=extra_args,
            )

            return f"{self.public_domain}/{destination_name}"
        except ClientError as error:
            print(f"[R2 Storage Error] Upload failed: {error}")
            return ""

    def delete_file(self, destination_name: str) -> bool:
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=destination_name,
            )
            return True
        except ClientError as error:
            print(f"[R2 Storage Error] Delete failed: {error}")
            return False
