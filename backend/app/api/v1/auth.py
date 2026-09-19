from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate, UserLogin, Token, OTPVerify, OTPRequest
from app.core.security import create_access_token, verify_password

router = APIRouter()

@router.post("/register", response_model=Any)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    await AuthService.create_user(db, email=user_in.email, password=user_in.password, full_name=user_in.full_name)
    return {"message": "User created successfully. Please login to receive OTP."}

@router.post("/login/step1", response_model=Any)
async def login_step1(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_user_by_email(db, email=credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Generate and send OTP
    await AuthService.create_otp(db, email=credentials.email)
    return {"message": "OTP sent to your email.", "email": credentials.email}

@router.post("/login/step2", response_model=Token)
async def login_step2(otp_verify: OTPVerify, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_user_by_email(db, email=otp_verify.email)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    is_valid = await AuthService.verify_otp(db, email=otp_verify.email, code=otp_verify.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}
