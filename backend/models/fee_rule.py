from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from ..database import Base


class FeeRule(Base):
    __tablename__ = "fee_rules"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String, unique=True, nullable=False)
    fee_percentage = Column(Numeric(precision=5, scale=4), nullable=False)
    min_fee = Column(Numeric(precision=15, scale=2), default=0)
    max_fee = Column(Numeric(precision=15, scale=2), nullable=True)
    effective_date = Column(DateTime, server_default=func.now())
