import secrets
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..models.session import AgentSession
from ..models.wallet import Wallet
from .audit_service import log_session_event
from .fee_service import calculate_fee


def create_session(
    db: Session,
    agent_id: int,
    customer_id: int,
    amount: Decimal,
) -> AgentSession:
    now = datetime.utcnow()
    session = AgentSession(
        agent_id=agent_id,
        customer_id=customer_id,
        transaction_type="cash_out",
        requested_amount=amount,
        challenge_code=secrets.token_urlsafe(32),
        status="pending",
        created_at=now,
        expires_at=now + timedelta(minutes=settings.session_expire_minutes),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    log_session_event(db, session.id, "requested", {"amount": float(amount)})
    return session


def get_session_or_404(db: Session, session_id: int) -> AgentSession:
    session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def expire_stale_sessions(db: Session) -> None:
    now = datetime.utcnow()
    stale = (
        db.query(AgentSession)
        .filter(AgentSession.status == "pending", AgentSession.expires_at <= now)
        .all()
    )
    for s in stale:
        s.status = "expired"
        log_session_event(db, s.id, "expired")
    if stale:
        db.commit()


def check_sufficient_balance(db: Session, session: AgentSession) -> bool:
    fee = calculate_fee(db, "cash_out", Decimal(str(session.requested_amount)))
    total_needed = Decimal(str(session.requested_amount)) + fee

    wallet = db.query(Wallet).filter(Wallet.user_id == session.customer_id).first()
    result = bool(wallet and Decimal(str(wallet.balance)) >= total_needed)

    # Log only the boolean — never the actual balance value
    log_session_event(db, session.id, "balance_checked", {"sufficient": result})
    return result


def approve_session(
    db: Session,
    session: AgentSession,
    approval_method: str,
    otp_required: bool = False,
) -> AgentSession:
    if datetime.utcnow() > session.expires_at:
        session.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Session has expired")

    session.status = "approved"
    session.approval_method = approval_method
    session.otp_required = otp_required
    session.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    log_session_event(db, session.id, "approved", {"method": approval_method})
    return session


def complete_session(db: Session, session: AgentSession) -> AgentSession:
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    log_session_event(db, session.id, "completed")
    return session
