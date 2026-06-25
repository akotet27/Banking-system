from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import require_role
from ..models.applications import MerchantApplication
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

    app = MerchantApplication(user_id=current_user.id, business_name=payload.business_name)
    db.add(app)
    db.commit()
    db.refresh(app)
    return app
