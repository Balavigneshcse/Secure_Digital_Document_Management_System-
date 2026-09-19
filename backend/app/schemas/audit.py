from pydantic import BaseModel
import uuid
from typing import Optional, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    resource_type: str
    resource_id: Optional[uuid.UUID]
    details: Optional[Any]
    ip_address: Optional[str]
    hash: str
    previous_hash: Optional[str]
    blockchain_tx_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
