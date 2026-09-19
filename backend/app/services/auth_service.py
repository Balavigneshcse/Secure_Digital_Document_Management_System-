from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.otp import OTP
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.otp import generate_email_otp
from app.core.email import send_otp_email

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(db: AsyncSession, email: str, password: str, full_name: str) -> User:
        hashed_password = get_password_hash(password)
        db_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def create_otp(db: AsyncSession, email: str) -> str:
        code = generate_email_otp()
        expires = datetime.now(timezone.utc) + timedelta(minutes=5)
        otp_entry = OTP(email=email, otp_code=code, expires_at=expires)
        db.add(otp_entry)
        await db.commit()
        
        # Send actual email
        send_otp_email(email, code)
        
        return code

    @staticmethod
    async def verify_otp(db: AsyncSession, email: str, code: str) -> bool:
        stmt = select(OTP).where(
            OTP.email == email,
            OTP.otp_code == code,
            OTP.expires_at > datetime.now(timezone.utc)
        )
        result = await db.execute(stmt)
        otp_entry = result.scalars().first()
        if otp_entry:
            # Consume OTP
            await db.delete(otp_entry)
            await db.commit()
            return True
        return False
