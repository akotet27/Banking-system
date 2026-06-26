from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user, require_role
from ..models.kyc import KycRequest
from ..models.user import User
from ..schemas.kyc import KycRequestOut, KycReviewRequest, KycSubmitRequest

router = APIRouter(prefix="/kyc", tags=["kyc"])


class KycRequestWithUser(BaseModel):
    id: int
    customer_id: int
    agent_id: Optional[int] = None
    id_document_ref: Optional[str] = None
    status: str
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_dob: Optional[str] = None
    customer_location: Optional[str] = None

    model_config = {"from_attributes": True}


@router.post("/submit", response_model=KycRequestOut)
def submit_kyc(
    payload: KycSubmitRequest,
    current_user: User = Depends(require_role("customer", "merchant")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(KycRequest)
        .filter(KycRequest.customer_id == current_user.id, KycRequest.status == "pending")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="A pending KYC request already exists")

    kyc = KycRequest(customer_id=current_user.id, id_document_ref=payload.id_document_ref)
    db.add(kyc)
    db.commit()
    db.refresh(kyc)
    return kyc


@router.get("/my-status")
def my_kyc_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    latest = (
        db.query(KycRequest)
        .filter(KycRequest.customer_id == current_user.id)
        .order_by(KycRequest.created_at.desc())
        .first()
    )
    return {
        "kyc_status": current_user.kyc_status,
        "request_status": latest.status if latest else None,
        "request_id": latest.id if latest else None,
    }


@router.get("/pending", response_model=list[KycRequestWithUser])
def list_pending(
    current_user: User = Depends(require_role("agent", "admin")),
    db: Session = Depends(get_db),
):
    requests = db.query(KycRequest).filter(KycRequest.status == "pending").all()
    results = []
    for r in requests:
        customer = db.query(User).filter(User.id == r.customer_id).first()
        results.append(KycRequestWithUser(
            id=r.id,
            customer_id=r.customer_id,
            agent_id=r.agent_id,
            id_document_ref=r.id_document_ref,
            status=r.status,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
            customer_name=customer.full_name if customer else None,
            customer_phone=customer.phone_number if customer else None,
            customer_dob=str(customer.date_of_birth) if customer and customer.date_of_birth else None,
            customer_location=customer.location if customer else None,
        ))
    return results


@router.post("/review")
def review_kyc(
    payload: KycReviewRequest,
    current_user: User = Depends(require_role("agent", "admin")),
    db: Session = Depends(get_db),
):
    if payload.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be verified or rejected")

    kyc = db.query(KycRequest).filter(KycRequest.id == payload.kyc_request_id).first()
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC request not found")

    kyc.status = payload.status
    kyc.agent_id = current_user.id
    kyc.reviewed_at = datetime.utcnow()

    if payload.status == "verified":
        customer = db.query(User).filter(User.id == kyc.customer_id).first()
        if customer:
            customer.kyc_status = "verified"

    db.commit()
    return {"message": f"KYC {payload.status}"}
