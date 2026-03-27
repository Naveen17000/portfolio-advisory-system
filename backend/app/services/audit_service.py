import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog

logger = logging.getLogger("portfolio_api")


async def log_audit(db: AsyncSession, user_id: UUID | None, action: str, resource: str, details: str | None = None, ip_address: str | None = None):
    entry = AuditLog(user_id=user_id, action=action, resource=resource, details=details, ip_address=ip_address)
    db.add(entry)
    await db.flush()
    logger.info("audit_log", extra={"user_id": str(user_id), "action": action, "resource": resource})
