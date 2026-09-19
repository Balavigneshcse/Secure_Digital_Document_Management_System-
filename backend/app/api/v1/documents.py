from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from app.schemas.document import DocumentResponse
from app.services.document_service import DocumentService
from app.services.audit_service import AuditService
from app.models.document import ClassificationEnum

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    classification: ClassificationEnum = Form(ClassificationEnum.OTHER),
    case_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.SUPERVISOR))
):
    try:
        document = await DocumentService.upload_document(
            db=db,
            file=file,
            title=title,
            uploaded_by=current_user.id,
            description=description,
            case_id=case_id,
            classification=classification
        )
        # Log audit action
        await AuditService.log_action(
            db=db,
            user_id=current_user.id,
            action="UPLOAD",
            resource_type="document",
            resource_id=document.id
        )
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.DEFENCE))
):
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="VIEW_METADATA",
        resource_type="document",
        resource_id=document.id
    )
    return document
