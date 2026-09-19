from pydantic import BaseModel
import uuid
from typing import Optional
from datetime import datetime
from app.models.case import CaseStatusEnum

class CaseBase(BaseModel):
    case_number: str
    title: str
    description: Optional[str] = None
    status: CaseStatusEnum = CaseStatusEnum.OPEN
    assigned_to: Optional[uuid.UUID] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatusEnum] = None
    assigned_to: Optional[uuid.UUID] = None

class CaseResponse(CaseBase):
    id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
