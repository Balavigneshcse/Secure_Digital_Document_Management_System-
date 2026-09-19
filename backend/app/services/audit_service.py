import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document
from app.models.audit_log import AuditLog
from app.core.hashing import compute_sha256

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[uuid.UUID] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        # Get the previous hash for the chain
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(1)
        result = await db.execute(stmt)
        last_log = result.scalar_one_or_none()
        previous_hash = last_log.hash if last_log else "GENESIS"

        # Construct the payload to hash
        payload = f"{user_id}:{action}:{resource_type}:{resource_id}:{previous_hash}"
        current_hash = compute_sha256(payload.encode('utf-8'))

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            hash=current_hash,
            previous_hash=previous_hash
        )
        db.add(audit_log)
        await db.commit()
        await db.refresh(audit_log)
        return audit_log

    @staticmethod
    async def get_document_audit_trail(db: AsyncSession, document_id: uuid.UUID) -> List[AuditLog]:
        stmt = select(AuditLog).where(
            AuditLog.resource_type == "document",
            AuditLog.resource_id == document_id
        ).order_by(AuditLog.created_at.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())
