from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, func
from ..database import Base


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # cash_out only for now
    requested_amount = Column(Numeric(precision=15, scale=2), nullable=False)
    challenge_code = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | approved | expired | completed
    approval_method = Column(String, nullable=True)  # phone_webauthn | agent_device_webauthn
    otp_required = Column(Boolean, default=False)
    otp_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class SessionAuditLog(Base):
    __tablename__ = "session_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("agent_sessions.id"), nullable=False)
    # requested | challenge_sent | biometric_verified | otp_sent | otp_verified |
    # approved | balance_checked | completed | expired
    event_type = Column(String, nullable=False)
    event_metadata = Column(String, nullable=True)  # JSON blob — never includes balance values
    created_at = Column(DateTime, server_default=func.now())
