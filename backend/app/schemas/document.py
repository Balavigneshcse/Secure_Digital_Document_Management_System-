from pydantic import BaseModel
import uuid
from typing import Optional
from datetime import datetime
from app.models.document import ClassificationEnum

class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    classification: ClassificationEnum = ClassificationEnum.OTHER
    case_id: Optional[uuid.UUID] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    file_type: str
    sha256_hash: str
    uploaded_by: uuid.UUID
    blockchain_tx_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
