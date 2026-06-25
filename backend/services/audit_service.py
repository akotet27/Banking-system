import json

from sqlalchemy.orm import Session

from ..models.session import SessionAuditLog


def log_session_event(
    db: Session,
    session_id: int,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    entry = SessionAuditLog(
        session_id=session_id,
        event_type=event_type,
        # Intentionally exclude balance values — privacy invariant
        event_metadata=json.dumps(metadata) if metadata else None,
    )
    db.add(entry)
    db.commit()
