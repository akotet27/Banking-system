from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import datetime
from typing import Optional


class TransactionOut(BaseModel):
    id: int
    type: str
    initiator_id: int
    counterparty_id: Optional[int]
    counterparty_name: Optional[str] = None
    counterparty_phone: Optional[str] = None
    amount: Decimal
    fee: Decimal
    fee_paid_by: Optional[str]
    net_amount: Decimal
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CashInRequest(BaseModel):
    customer_phone: str
    amount: Decimal
    idempotency_key: str

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class CashOutRequest(BaseModel):
    customer_phone: str
    amount: Decimal
    idempotency_key: str

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class SendMoneyRequest(BaseModel):
    recipient_phone: str
    amount: Decimal
    idempotency_key: str

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class PayMerchantRequest(BaseModel):
    merchant_phone: str
    amount: Decimal
    idempotency_key: str

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v
