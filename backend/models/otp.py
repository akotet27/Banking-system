from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from ..database import Base


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # signup | fallback_biometric_2fa
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
