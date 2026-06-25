from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from ..database import Base


class BiometricCredential(Base):
    __tablename__ = "biometric_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    credential_id = Column(String, nullable=False, index=True)
    public_key = Column(String, nullable=False)
    enrollment_type = Column(String, nullable=False)  # phone | agent_device
    bound_agent_id = Column(Integer, ForeignKey("users.id"), default=None)
    device_label = Column(String)
    sign_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
