from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.user import User
from ..schemas.transaction import CashInRequest, TransactionOut
from ..services.ledger_service import process_cash_in

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/cash-in", response_model=TransactionOut)
def cash_in(
    payload: CashInRequest,
    current_user: User = Depends(require_role("agent")),
    db: Session = Depends(get_db),
):
    customer = db.query(User).filter(User.phone_number == payload.customer_phone).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.role != "customer":
        raise HTTPException(status_code=400, detail="Target account is not a customer")
    if customer.is_frozen:
        raise HTTPException(status_code=400, detail="Customer account is frozen")
    if not customer.email_verified:
        raise HTTPException(status_code=400, detail="Customer email not verified")

    return process_cash_in(
        db,
        agent_id=current_user.id,
        customer_id=customer.id,
        amount=payload.amount,
        idempotency_key=payload.idempotency_key,
    )
