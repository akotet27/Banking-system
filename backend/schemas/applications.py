from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AgentApplicationOut(BaseModel):
    id: int
    user_id: int
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class MerchantApplicationCreate(BaseModel):
    business_name: str


class MerchantApplicationOut(BaseModel):
    id: int
    user_id: int
    business_name: str
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationReview(BaseModel):
    application_id: int
    status: str  # approved | rejected
