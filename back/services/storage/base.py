from abc import ABC, abstractmethod


class StorageServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class BaseStorage(ABC):
    @abstractmethod
    def create_upload_credentials(
        self,
        original_filename: str,
        content_type: str,
        file_size: int,
    ) -> dict:
        """Tạo thông tin để client upload trực tiếp lên storage"""
        pass

    @abstractmethod
    def file_exists(self, destination_name: str) -> bool:
        """Kiểm tra file đã tồn tại trên storage"""
        pass

    @abstractmethod
    def upload_file(self, file_path: str, destination_name: str) -> str:
        """Upload file và trả về URL public (CDN)"""
        pass

    @abstractmethod
    def delete_file(self, destination_name: str) -> bool:
        """Xóa file khỏi storage"""
        pass
