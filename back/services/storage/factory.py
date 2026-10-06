from core.cloudflare import (
    R2_ACCESS_KEY_ID,
    R2_BUCKET_NAME,
    R2_ENDPOINT_URL,
    R2_PUBLIC_DOMAIN,
    R2_SECRET_ACCESS_KEY,
    STORAGE_PROVIDER,
)
from services.storage.base import BaseStorage, StorageServiceError
from services.storage.r2_storage import R2Storage


_storage_service: BaseStorage | None = None


class StorageFactory:
    @staticmethod
    def get_storage() -> BaseStorage:
        if STORAGE_PROVIDER != "r2":
            raise StorageServiceError("Backend hiện chỉ hỗ trợ Cloudflare R2.", status_code=500)

        if not all([R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN]):
            raise StorageServiceError("Thiếu cấu hình Cloudflare R2 trong file .env.", status_code=500)

        return R2Storage(
            endpoint_url=R2_ENDPOINT_URL,
            access_key_id=R2_ACCESS_KEY_ID,
            secret_access_key=R2_SECRET_ACCESS_KEY,
            bucket_name=R2_BUCKET_NAME,
            public_domain=R2_PUBLIC_DOMAIN,
        )


def get_storage_service() -> BaseStorage:
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageFactory.get_storage()
    return _storage_service
