from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class KycSubmitRequest(BaseModel):
    id_document_ref: str


class KycReviewRequest(BaseModel):
    kyc_request_id: int
    status: str  # verified | rejected


class KycRequestOut(BaseModel):
    id: int
    customer_id: int
    agent_id: Optional[int]
    id_document_ref: Optional[str]
    document_file: Optional[str] = None
    status: str
    reviewed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
