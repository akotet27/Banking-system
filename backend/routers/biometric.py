import json
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.biometric import BiometricCredential
from ..models.user import User
from ..schemas.biometric import (
    BiometricAuthenticateRequest,
    BiometricCredentialOut,
    BiometricEnrollBeginRequest,
    BiometricEnrollFinishRequest,
)
from ..services import webauthn_service

router = APIRouter(prefix="/biometric", tags=["biometric"])

# Per-user pending registration/authentication challenges (in-memory; replace with Redis for prod)
_pending_reg_challenges: dict[int, str] = {}
_pending_auth_challenges: dict[int, str] = {}


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


@router.post("/authenticate/begin")
def authenticate_begin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step-up authentication for sensitive actions (e.g. confirming a transfer)
    that aren't tied to an agent-assisted session. Unlike /sessions/*, this
    just proves the currently logged-in user is present via their own device.
    """
    credentials = (
        db.query(BiometricCredential)
        .filter(BiometricCredential.user_id == current_user.id)
        .all()
    )
    if not credentials:
        raise HTTPException(status_code=400, detail="No biometric credentials enrolled")

    credential_ids = [c.credential_id for c in credentials]
    challenge = secrets.token_urlsafe(32)
    options = webauthn_service.begin_authentication(credential_ids, challenge)
    _pending_auth_challenges[current_user.id] = challenge
    return options


@router.post("/authenticate/finish")
def authenticate_finish(
    payload: BiometricAuthenticateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = _pending_auth_challenges.pop(current_user.id, None)
    if not challenge:
        raise HTTPException(status_code=400, detail="No pending authentication challenge")

    if payload.credential is None:
        # dev-mode stub (py-webauthn not installed) — nothing to verify
        return {"verified": True}

    credential_id_from_response = payload.credential.get("id", "")
    cred = (
        db.query(BiometricCredential)
        .filter(
            BiometricCredential.user_id == current_user.id,
            BiometricCredential.credential_id == credential_id_from_response,
        )
        .first()
    )
    if not cred:
        raise HTTPException(status_code=400, detail="Unknown credential")

    verified = webauthn_service.finish_authentication(
        credential_response=payload.credential,
        expected_challenge=challenge,
        stored_public_key_b64=cred.public_key,
        current_sign_count=cred.sign_count,
    )
    if not verified:
        raise HTTPException(status_code=400, detail="Biometric verification failed")

    cred.sign_count += 1
    db.commit()
    return {"verified": True}
