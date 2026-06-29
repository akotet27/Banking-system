from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from ..database import Base


class FloatRequest(Base):
    __tablename__ = "float_requests"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(precision=15, scale=2), nullable=False)
    status = Column(String, default="pending")  # pending | approved | rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
