from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.applications import AgentApplication, MerchantApplication
from ..models.user import User
from ..schemas.applications import AgentApplicationOut

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/apply", response_model=AgentApplicationOut)
def apply_as_agent(
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(AgentApplication)
        .filter(
            AgentApplication.user_id == current_user.id,
            AgentApplication.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Pending agent application already exists")

    merchant_app = (
        db.query(MerchantApplication)
        .filter(
            MerchantApplication.user_id == current_user.id,
            MerchantApplication.status.in_(["pending", "approved"]),
        )
        .first()
    )
    if merchant_app:
        raise HTTPException(
            status_code=400,
            detail="You already have a merchant application. You cannot apply for both roles at the same time.",
        )

    app = AgentApplication(user_id=current_user.id)
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/my-application", response_model=AgentApplicationOut)
def my_application(
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    app = (
        db.query(AgentApplication)
        .filter(AgentApplication.user_id == current_user.id)
        .order_by(AgentApplication.created_at.desc())
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="No application found")
    return app
