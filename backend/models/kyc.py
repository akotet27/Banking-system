from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from ..database import Base


class KycRequest(Base):
    __tablename__ = "kyc_requests"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    id_document_ref = Column(String)
    status = Column(String, default="pending")  # pending | verified | rejected
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
