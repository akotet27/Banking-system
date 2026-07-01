from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user, require_role
from ..models.applications import AgentApplication, MerchantApplication
from ..models.user import User
from ..schemas.applications import MerchantApplicationCreate, MerchantApplicationOut

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.post("/apply", response_model=MerchantApplicationOut)
def apply_as_merchant(
    payload: MerchantApplicationCreate,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(MerchantApplication)
        .filter(
            MerchantApplication.user_id == current_user.id,
            MerchantApplication.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Pending merchant application already exists")

    agent_app = (
        db.query(AgentApplication)
        .filter(
            AgentApplication.user_id == current_user.id,
            AgentApplication.status.in_(["pending", "approved"]),
        )
        .first()
    )
    if agent_app:
        raise HTTPException(
            status_code=400,
            detail="You already have an agent application. You cannot apply for both roles at the same time.",
        )

    app = MerchantApplication(user_id=current_user.id, business_name=payload.business_name)
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/my-application", response_model=MerchantApplicationOut)
def my_merchant_application(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = (
        db.query(MerchantApplication)
        .filter(MerchantApplication.user_id == current_user.id)
        .order_by(MerchantApplication.created_at.desc())
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="No merchant application found")
    return app
