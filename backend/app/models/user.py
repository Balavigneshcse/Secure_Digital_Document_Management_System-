import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class RoleEnum(str, enum.Enum):
    IO = "IO"
    SUPERVISOR = "SUPERVISOR"
    EVIDENCE_CUSTODIAN = "EVIDENCE_CUSTODIAN"
    FORENSIC = "FORENSIC"
    PROSECUTOR = "PROSECUTOR"
    JUDGE = "JUDGE"
    COURT_STAFF = "COURT_STAFF"
    PRISON_OFFICER = "PRISON_OFFICER"
    DEFENCE = "DEFENCE"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"

class DepartmentEnum(str, enum.Enum):
    POLICE_STATION = "POLICE_STATION"
    SENIOR_POLICE = "SENIOR_POLICE"
    EVIDENCE_STORE = "EVIDENCE_STORE"
    FORENSIC_LAB = "FORENSIC_LAB"
    MEDICO_LEGAL = "MEDICO_LEGAL"
    PROSECUTION = "PROSECUTION"
    COURTS = "COURTS"
    PRISON = "PRISON"
    DEFENCE_LEGAL_AID = "DEFENCE_LEGAL_AID"
    ADMIN_IT = "ADMIN_IT"
    AUDIT_COMPLIANCE = "AUDIT_COMPLIANCE"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.DEFENCE, nullable=False)
    department = Column(Enum(DepartmentEnum), nullable=True)
    post = Column(String, nullable=True)
    otp_secret = Column(String, nullable=True)  # Added for PyOTP if used, can be optional
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
