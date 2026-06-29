from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role, require_verified_email
from ..models.float_request import FloatRequest
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

    # Check for an already-pending request from this agent
    existing = db.query(FloatRequest).filter(
        FloatRequest.agent_id == current_user.id,
        FloatRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending float request.")

    req = FloatRequest(agent_id=current_user.id, amount=payload.amount)
    db.add(req)
    db.commit()
    db.refresh(req)
    return {
        "message": "Float request submitted. An admin will review it shortly.",
        "request_id": req.id,
        "amount": float(req.amount),
        "status": req.status,
    }


@router.get("/float-requests")
def get_float_requests(
    current_user: User = Depends(require_role("agent")),
    db: Session = Depends(get_db),
):
    requests = (
        db.query(FloatRequest)
        .filter(FloatRequest.agent_id == current_user.id)
        .order_by(FloatRequest.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": r.id,
            "amount": float(r.amount),
            "status": r.status,
            "notes": r.notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        }
        for r in requests
    ]
