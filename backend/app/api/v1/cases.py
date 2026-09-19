from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse
from app.models.case import Case
from app.services.audit_service import AuditService
from sqlalchemy import select

router = APIRouter()

@router.post("/", response_model=CaseResponse)
async def create_case(
    case_in: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.SUPERVISOR))
):
    stmt = select(Case).where(Case.case_number == case_in.case_number)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Case number already exists")
        
    db_case = Case(
        case_number=case_in.case_number,
        title=case_in.title,
        description=case_in.description,
        status=case_in.status,
        assigned_to=case_in.assigned_to,
        created_by=current_user.id
    )
    db.add(db_case)
    await db.commit()
    await db.refresh(db_case)
    
    await AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_CASE",
        resource_type="case",
        resource_id=db_case.id
    )
    return db_case

@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.DEFENCE))
):
    stmt = select(Case).order_by(Case.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
