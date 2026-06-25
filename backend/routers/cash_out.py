from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.user import User
from ..models.wallet import Wallet
from ..schemas.session import SessionConfirmRequest, SessionCreateRequest
from ..schemas.transaction import TransactionOut
from ..services.fee_service import calculate_fee
from ..services.ledger_service import process_cash_out
from ..services.session_service import (
    check_sufficient_balance,
    complete_session,
    create_session,
    expire_stale_sessions,
    get_session_or_404,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/cash-out/initiate")
def initiate_cash_out(
    payload: SessionCreateRequest,
    current_user: User = Depends(require_role("agent")),
    db: Session = Depends(get_db),
):
    expire_stale_sessions(db)

    customer = db.query(User).filter(User.phone_number == payload.customer_phone).first()
    if not customer or customer.role != "customer":
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.is_frozen:
        raise HTTPException(status_code=400, detail="Customer account is frozen")

    # Pre-check balance before creating the session — no point asking customer to approve if funds are insufficient
    customer_wallet = db.query(Wallet).filter(Wallet.user_id == customer.id).first()
    fee = calculate_fee(db, "cash_out", payload.amount)
    total_needed = Decimal(str(payload.amount)) + fee
    if not customer_wallet or Decimal(str(customer_wallet.balance)) < total_needed:
        raise HTTPException(
            status_code=400,
            detail=f"Customer has insufficient balance for {float(payload.amount):,.0f} RWF withdrawal (fee: {float(fee):,.0f} RWF)",
        )

    session = create_session(db, current_user.id, customer.id, payload.amount)
    return {
        "session_id": session.id,
        "challenge_code": session.challenge_code,
        "expires_at": session.expires_at,
        "message": "Session created. Waiting for customer biometric approval.",
    }


@router.post("/cash-out/confirm", response_model=TransactionOut)
def confirm_cash_out(
    payload: SessionConfirmRequest,
    current_user: User = Depends(require_role("agent")),
    db: Session = Depends(get_db),
):
    session = get_session_or_404(db, payload.session_id)

    if session.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Session belongs to a different agent")
    if session.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Session cannot be confirmed (current status: {session.status})",
        )

    if not check_sufficient_balance(db, session):
        raise HTTPException(status_code=400, detail="Insufficient balance")

    idempotency_key = f"cashout-session-{session.id}"
    txn = process_cash_out(
        db,
        agent_id=current_user.id,
        customer_id=session.customer_id,
        amount=Decimal(str(session.requested_amount)),
        session_id=session.id,
        idempotency_key=idempotency_key,
    )
    complete_session(db, session)
    return txn
