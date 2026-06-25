from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.applications import AgentApplication, MerchantApplication
from ..models.fee_rule import FeeRule
from ..models.session import SessionAuditLog
from ..models.transaction import Transaction
from ..models.user import User
from ..models.wallet import Wallet
from ..schemas.applications import AgentApplicationOut, ApplicationReview, MerchantApplicationOut
from ..schemas.fee_rule import FeeRuleOut, FeeRuleUpdate
from ..schemas.transaction import TransactionOut

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Agent applications ──────────────────────────────────────────────────────

@router.get("/applications/agents", response_model=list[AgentApplicationOut])
def list_agent_apps(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return db.query(AgentApplication).order_by(AgentApplication.created_at.desc()).all()


@router.post("/applications/agents/review")
def review_agent_app(
    payload: ApplicationReview,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    app = db.query(AgentApplication).filter(AgentApplication.id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = payload.status
    app.reviewed_by = current_user.id
    app.reviewed_at = datetime.utcnow()

    if payload.status == "approved":
        user = db.query(User).filter(User.id == app.user_id).first()
        if user:
            user.role = "agent"
            wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()
            if wallet and wallet.float_balance is None:
                wallet.float_balance = 0

    db.commit()
    return {"message": f"Agent application {payload.status}"}


# ── Merchant applications ───────────────────────────────────────────────────

@router.get("/applications/merchants", response_model=list[MerchantApplicationOut])
def list_merchant_apps(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return db.query(MerchantApplication).order_by(MerchantApplication.created_at.desc()).all()


@router.post("/applications/merchants/review")
def review_merchant_app(
    payload: ApplicationReview,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    app = (
        db.query(MerchantApplication)
        .filter(MerchantApplication.id == payload.application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = payload.status
    app.reviewed_by = current_user.id
    app.reviewed_at = datetime.utcnow()

    if payload.status == "approved":
        user = db.query(User).filter(User.id == app.user_id).first()
        if user:
            user.role = "merchant"

    db.commit()
    return {"message": f"Merchant application {payload.status}"}


# ── Account management ──────────────────────────────────────────────────────

@router.post("/accounts/{user_id}/freeze")
def freeze(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_frozen = True
    db.commit()
    return {"message": "Account frozen"}


@router.post("/accounts/{user_id}/unfreeze")
def unfreeze(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_frozen = False
    db.commit()
    return {"message": "Account unfrozen"}


# ── Transactions & audit ────────────────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionOut])
def all_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/audit-log")
def audit_log(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return (
        db.query(SessionAuditLog)
        .order_by(SessionAuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# ── Users ───────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    role: str = None,
    limit: int = 100,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return [
        {
            "id": u.id, "phone_number": u.phone_number, "email": u.email,
            "full_name": u.full_name, "role": u.role,
            "kyc_status": u.kyc_status, "is_frozen": u.is_frozen,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in q.order_by(User.created_at.desc()).limit(limit).all()
    ]


@router.get("/stats")
def admin_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    from ..models.wallet import Wallet
    customers = db.query(User).filter(User.role == "customer").count()
    agents    = db.query(User).filter(User.role == "agent").count()
    merchants = db.query(User).filter(User.role == "merchant").count()
    txn_vol   = db.query(Transaction).count()
    pending_agents    = db.query(AgentApplication).filter(AgentApplication.status == "pending").count()
    pending_merchants = db.query(MerchantApplication).filter(MerchantApplication.status == "pending").count()
    from sqlalchemy import func
    vol = db.query(func.sum(Transaction.amount)).scalar() or 0
    return {
        "total_customers": customers,
        "active_agents": agents,
        "total_merchants": merchants,
        "transaction_volume": float(vol),
        "pending_approvals": pending_agents + pending_merchants,
        "pending_agents": pending_agents,
        "pending_merchants": pending_merchants,
    }


# ── Fee rules ───────────────────────────────────────────────────────────────

@router.get("/fee-rules", response_model=list[FeeRuleOut])
def get_fee_rules(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return db.query(FeeRule).all()


@router.post("/fee-rules", response_model=FeeRuleOut)
def upsert_fee_rule(
    payload: FeeRuleUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rule = db.query(FeeRule).filter(FeeRule.transaction_type == payload.transaction_type).first()
    if rule:
        rule.fee_percentage = payload.fee_percentage
        rule.min_fee = payload.min_fee
        rule.max_fee = payload.max_fee
        rule.effective_date = datetime.utcnow()
    else:
        rule = FeeRule(
            transaction_type=payload.transaction_type,
            fee_percentage=payload.fee_percentage,
            min_fee=payload.min_fee,
            max_fee=payload.max_fee,
        )
        db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule
