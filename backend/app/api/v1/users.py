from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from sqlalchemy import select
from pydantic import BaseModel

router = APIRouter()

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: RoleEnum
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(RoleChecker(RoleEnum.ADMIN))
):
    stmt = select(User)
    result = await db.execute(stmt)
    return list(result.scalars().all())

class RoleUpdate(BaseModel):
    role: RoleEnum

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    role_update: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(RoleChecker(RoleEnum.ADMIN))
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    return user
