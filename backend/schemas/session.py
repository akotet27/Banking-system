from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional, Any


class SessionCreateRequest(BaseModel):
    customer_phone: str
    amount: Decimal


class SessionStatusResponse(BaseModel):
    session_id: int
    status: str
    expires_at: datetime
    sufficient_balance: Optional[bool] = None


class SessionApproveRequest(BaseModel):
    approval_method: str  # phone_webauthn | agent_device_webauthn
    webauthn_response: Optional[Any] = None  # browser WebAuthn credential response


class SessionConfirmRequest(BaseModel):
    session_id: int
