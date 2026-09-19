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
from typing import Optional
from app.models.user import DepartmentEnum

router = APIRouter()

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: RoleEnum
    department: Optional[DepartmentEnum] = None
    post: Optional[str] = None
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

class UserUpdate(BaseModel):
    role: Optional[RoleEnum] = None
    department: Optional[DepartmentEnum] = None
    post: Optional[str] = None

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(RoleChecker(RoleEnum.ADMIN))
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.post is not None:
        user.post = user_update.post
        
    await db.commit()
    await db.refresh(user)
    return user
