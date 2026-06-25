from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # customer | agent | merchant | admin
    full_name = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)  # ISO format: YYYY-MM-DD
    location = Column(String, nullable=True)  # e.g. "Kigali, Gasabo"
    email_verified = Column(Boolean, default=False)
    kyc_status = Column(String, default="pending")  # pending | verified | rejected
    is_frozen = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
