import os
from app.config import settings

class MinioService:
    def __init__(self):
        self.bucket_name = settings.MINIO_BUCKET_DOCUMENTS
        self.storage_dir = os.path.join(os.getcwd(), "local_storage", self.bucket_name)
        self._ensure_bucket()

    def _ensure_bucket(self):
        os.makedirs(self.storage_dir, exist_ok=True)

    def upload_file(self, object_name: str, file_data, length: int, content_type: str):
        try:
            file_path = os.path.join(self.storage_dir, object_name)
            with open(file_path, "wb") as f:
                f.write(file_data.read())
            return True
        except Exception as err:
            print(f"Error uploading to local storage: {err}")
            return False

    def get_presigned_url(self, object_name: str, expires=3600) -> str:
        # Mock URL for local development
        return f"http://localhost:8000/documents/download/{object_name}"

minio_service = MinioService()

