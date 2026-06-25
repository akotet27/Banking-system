from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional


class FeeRuleUpdate(BaseModel):
    transaction_type: str
    fee_percentage: Decimal
    min_fee: Decimal = Decimal("0")
    max_fee: Optional[Decimal] = None


class FeeRuleOut(BaseModel):
    id: int
    transaction_type: str
    fee_percentage: Decimal
    min_fee: Decimal
    max_fee: Optional[Decimal]
    effective_date: datetime

    model_config = {"from_attributes": True}
