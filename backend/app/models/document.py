import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum, ForeignKey, Integer, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class ClassificationEnum(str, enum.Enum):
    FIR = "FIR"
    CHARGESHEET = "CHARGESHEET"
    EVIDENCE = "EVIDENCE"
    WITNESS_STATEMENT = "WITNESS_STATEMENT"
    FORENSIC_REPORT = "FORENSIC_REPORT"
    COURT_FILING = "COURT_FILING"
    MEDICAL_REPORT = "MEDICAL_REPORT"
    ARREST_WARRANT = "ARREST_WARRANT"
    OTHER = "OTHER"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True)
    
    classification = Column(Enum(ClassificationEnum), default=ClassificationEnum.OTHER)
    blockchain_tx_id = Column(String, nullable=True)
    
    ocr_text = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)
    
    version = Column(Integer, default=1)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
