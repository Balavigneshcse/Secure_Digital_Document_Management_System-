from pydantic import BaseModel, EmailStr

from app.models.user import RoleEnum, DepartmentEnum
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: Optional[RoleEnum] = None
    department: Optional[DepartmentEnum] = None
    post: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str

class Token(BaseModel):
    access_token: str
    token_type: str
