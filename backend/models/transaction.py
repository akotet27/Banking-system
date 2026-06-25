from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from ..database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # cash_in | cash_out | send_money | pay_merchant
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    counterparty_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount = Column(Numeric(precision=15, scale=2), nullable=False)
    fee = Column(Numeric(precision=15, scale=2), default=0)
    fee_paid_by = Column(String, nullable=True)  # customer | merchant | n/a
    net_amount = Column(Numeric(precision=15, scale=2), nullable=False)
    related_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    status = Column(String, default="completed")  # pending | completed | failed
    session_id = Column(Integer, ForeignKey("agent_sessions.id"), nullable=True)
    idempotency_key = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
