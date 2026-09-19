import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    INVESTIGATOR = "INVESTIGATOR"
    LEGAL = "LEGAL"
    VIEWER = "VIEWER"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.VIEWER, nullable=False)
    otp_secret = Column(String, nullable=True)  # Added for PyOTP if used, can be optional
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
