from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role, require_verified_email
from ..models.user import User
from ..models.wallet import Wallet
from ..schemas.wallet import BalanceResponse

router = APIRouter(prefix="/wallets", tags=["wallets"])


class FloatTopupRequest(BaseModel):
    amount: Decimal


@router.get("/balance", response_model=BalanceResponse)
def get_balance(
    current_user: User = Depends(require_verified_email),
    db: Session = Depends(get_db),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return BalanceResponse(
        balance=wallet.balance,
        float_balance=wallet.float_balance,
        currency=wallet.currency,
    )


@router.post("/float-topup")
def float_topup(
    payload: FloatTopupRequest,
    current_user: User = Depends(require_role("agent")),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet or wallet.float_balance is None:
        raise HTTPException(status_code=400, detail="No float wallet found for this account")
    wallet.float_balance += payload.amount
    db.commit()
    db.refresh(wallet)
    return {
        "message": "Float topped up successfully",
        "float_balance": float(wallet.float_balance),
    }
