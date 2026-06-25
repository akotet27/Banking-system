import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.biometric import BiometricCredential
from ..models.user import User
from ..schemas.biometric import (
    BiometricCredentialOut,
    BiometricEnrollBeginRequest,
    BiometricEnrollFinishRequest,
)
from ..services import webauthn_service

router = APIRouter(prefix="/biometric", tags=["biometric"])

# Per-user pending registration challenge (in-memory; replace with Redis for prod)
_pending_reg_challenges: dict[int, str] = {}


@router.post("/enroll/begin")
def enroll_begin(
    payload: BiometricEnrollBeginRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.enrollment_type == "agent_device" and payload.bound_agent_id is None:
        raise HTTPException(
            status_code=400, detail="bound_agent_id is required for agent_device enrollment"
        )

    existing = (
        db.query(BiometricCredential)
        .filter(BiometricCredential.user_id == current_user.id)
        .all()
    )
    existing_ids = [c.credential_id for c in existing]

    options = webauthn_service.begin_registration(
        current_user.id, current_user.phone_number, existing_ids
    )
    _pending_reg_challenges[current_user.id] = options.get("challenge", "")
    return options


@router.post("/enroll/finish", response_model=BiometricCredentialOut)
def enroll_finish(
    payload: BiometricEnrollFinishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = _pending_reg_challenges.pop(current_user.id, None)
    if not challenge:
        raise HTTPException(status_code=400, detail="No pending registration challenge")

    try:
        result = webauthn_service.finish_registration(challenge, payload.credential)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"WebAuthn verification failed: {exc}")

    cred = BiometricCredential(
        user_id=current_user.id,
        credential_id=result["credential_id"],
        public_key=result["public_key"],
        enrollment_type=payload.enrollment_type,
        bound_agent_id=payload.bound_agent_id,
        device_label=payload.device_label,
        sign_count=result.get("sign_count", 0),
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)
    return cred


@router.get("/credentials", response_model=list[BiometricCredentialOut])
def list_credentials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(BiometricCredential)
        .filter(BiometricCredential.user_id == current_user.id)
        .all()
    )


@router.delete("/credentials/{credential_id}")
def delete_credential(
    credential_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cred = (
        db.query(BiometricCredential)
        .filter(
            BiometricCredential.id == credential_id,
            BiometricCredential.user_id == current_user.id,
        )
        .first()
    )
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    db.delete(cred)
    db.commit()
    return {"message": "Credential removed"}
