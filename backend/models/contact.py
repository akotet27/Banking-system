from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from ..database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("owner_id", "contact_user_id", name="uq_contact"),)
