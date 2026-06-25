from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..models.transaction import Transaction
from ..schemas.user import UserOut, UserUpdate
from ..schemas.transaction import TransactionOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.date_of_birth is not None:
        current_user.date_of_birth = payload.date_of_birth
    if payload.location is not None:
        current_user.location = payload.location
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/lookup", response_model=UserOut)
def lookup_user(
    phone: str = Query(..., description="Phone number in E.164 format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Agents and merchants can look up basic user info by phone number."""
    if current_user.role not in ("agent", "merchant", "admin", "customer"):
        raise HTTPException(status_code=403, detail="Lookup not available for this role")
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that phone number")
    return user


@router.get("/me/transactions", response_model=list[TransactionOut])
def get_my_transactions(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Transaction)
        .filter(
            (Transaction.initiator_id == current_user.id)
            | (Transaction.counterparty_id == current_user.id)
        )
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
