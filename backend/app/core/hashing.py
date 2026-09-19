import hashlib
from fastapi import UploadFile

def compute_sha256(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of byte array."""
    return hashlib.sha256(file_bytes).hexdigest()

async def compute_sha256_stream(file: UploadFile) -> str:
    """Compute SHA-256 hash of a large file via streaming."""
    sha256 = hashlib.sha256()
    await file.seek(0)
    while True:
        chunk = await file.read(1024 * 1024) # 1MB chunks
        if not chunk:
            break
        sha256.update(chunk)
    await file.seek(0) # Reset file pointer for subsequent operations
    return sha256.hexdigest()

def verify_integrity(file_bytes: bytes, expected_hash: str) -> bool:
    """Verify if the computed hash matches the expected hash."""
    return compute_sha256(file_bytes) == expected_hash
