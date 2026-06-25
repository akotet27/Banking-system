from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.user import User
from ..schemas.transaction import SendMoneyRequest, TransactionOut
from ..services.ledger_service import process_send_money

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/send", response_model=TransactionOut)
def send_money(
    payload: SendMoneyRequest,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    recipient = db.query(User).filter(User.phone_number == payload.recipient_phone).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient.role not in ("customer", "merchant"):
        raise HTTPException(status_code=400, detail="Invalid recipient account type")
    if recipient.is_frozen:
        raise HTTPException(status_code=400, detail="Recipient account is frozen")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send money to yourself")

    debit_txn, _ = process_send_money(
        db,
        sender_id=current_user.id,
        recipient_id=recipient.id,
        amount=payload.amount,
        idempotency_key=payload.idempotency_key,
    )
    return debit_txn
