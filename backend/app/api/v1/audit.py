from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("/document/{document_id}", response_model=List[AuditLogResponse])
async def get_document_audit_trail(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.OFFICER))
):
    return await AuditService.get_document_audit_trail(db, document_id)
