from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.user import User
from ..schemas.transaction import PayMerchantRequest, TransactionOut
from ..services.ledger_service import process_pay_merchant

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/pay-merchant", response_model=TransactionOut)
def pay_merchant(
    payload: PayMerchantRequest,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    merchant = db.query(User).filter(User.phone_number == payload.merchant_phone).first()
    if not merchant or merchant.role != "merchant":
        raise HTTPException(status_code=404, detail="Merchant not found")
    if merchant.is_frozen:
        raise HTTPException(status_code=400, detail="Merchant account is frozen")

    return process_pay_merchant(
        db,
        customer_id=current_user.id,
        merchant_id=merchant.id,
        amount=payload.amount,
        idempotency_key=payload.idempotency_key,
    )
