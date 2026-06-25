from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional


class WalletOut(BaseModel):
    id: int
    user_id: int
    balance: Decimal
    float_balance: Optional[Decimal]
    currency: str
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    balance: Decimal
    float_balance: Optional[Decimal] = None
    currency: str
