from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from ..database import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(Numeric(precision=15, scale=2), nullable=False, default=0)
    float_balance = Column(Numeric(precision=15, scale=2), default=None)  # agents only
    currency = Column(String, default="RWF")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
