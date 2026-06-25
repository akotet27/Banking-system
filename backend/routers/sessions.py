from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.biometric import BiometricCredential
from ..models.session import AgentSession
from ..models.user import User
from ..schemas.session import SessionApproveRequest
from ..services import webauthn_service
from ..services.session_service import (
    approve_session,
    check_sufficient_balance,
    expire_stale_sessions,
    get_session_or_404,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

# In-memory challenge cache (per-session). Replace with Redis for multi-process.
_pending_auth_challenges: dict[int, str] = {}


@router.get("/{session_id}/status")
def get_status(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expire_stale_sessions(db)
    session = get_session_or_404(db, session_id)

    if current_user.id not in (session.agent_id, session.customer_id):
        raise HTTPException(status_code=403, detail="Access denied to this session")

    response: dict = {
        "session_id": session.id,
        "status": session.status,
        "expires_at": session.expires_at,
    }

    # Only reveal balance boolean to the agent, only when approved
    if (
        current_user.role == "agent"
        and current_user.id == session.agent_id
        and session.status == "approved"
    ):
        response["sufficient_balance"] = check_sufficient_balance(db, session)

    return response


@router.post("/{session_id}/begin-approval")
def begin_approval(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by the customer's device to get WebAuthn authentication options.
    The challenge is tied to the session's challenge_code so it cannot be
    replayed against a different session.
    """
    session = get_session_or_404(db, session_id)
    if current_user.id != session.customer_id:
        raise HTTPException(status_code=403, detail="Only the session's customer can approve")
    if session.status != "pending":
        raise HTTPException(status_code=400, detail=f"Session already {session.status}")
    if datetime.utcnow() > session.expires_at:
        raise HTTPException(status_code=400, detail="Session has expired")

    credentials = (
        db.query(BiometricCredential)
        .filter(BiometricCredential.user_id == current_user.id)
        .all()
    )
    if not credentials:
        raise HTTPException(status_code=400, detail="No biometric credentials enrolled")

    credential_ids = [c.credential_id for c in credentials]
    options = webauthn_service.begin_authentication(credential_ids, session.challenge_code)
    _pending_auth_challenges[session_id] = session.challenge_code
    return options


@router.post("/{session_id}/approve")
def approve(
    session_id: int,
    payload: SessionApproveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify the WebAuthn response and mark the session approved."""
    session = get_session_or_404(db, session_id)
    if current_user.id != session.customer_id:
        raise HTTPException(status_code=403, detail="Only the session's customer can approve")
    if session.status != "pending":
        raise HTTPException(status_code=400, detail=f"Session already {session.status}")
    if datetime.utcnow() > session.expires_at:
        raise HTTPException(status_code=400, detail="Session has expired")

    if payload.approval_method not in ("phone_webauthn", "agent_device_webauthn"):
        raise HTTPException(status_code=400, detail="Invalid approval method")

    if payload.webauthn_response:
        credential_id_from_response = payload.webauthn_response.get("id", "")
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

        expected_challenge = _pending_auth_challenges.pop(session_id, session.challenge_code)
        verified = webauthn_service.finish_authentication(
            credential_response=payload.webauthn_response,
            expected_challenge=expected_challenge,
            stored_public_key_b64=cred.public_key,
            current_sign_count=cred.sign_count,
        )
        if not verified:
            raise HTTPException(status_code=400, detail="Biometric verification failed")

        cred.sign_count += 1
        db.commit()

    otp_required = payload.approval_method == "agent_device_webauthn"
    approve_session(db, session, payload.approval_method, otp_required=otp_required)
    return {"message": "Session approved", "session_id": session.id}


@router.get("/pending")
def get_pending_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all pending cash-out sessions where this user is the customer."""
    expire_stale_sessions(db)
    sessions = (
        db.query(AgentSession)
        .filter(
            AgentSession.customer_id == current_user.id,
            AgentSession.status == "pending",
        )
        .order_by(AgentSession.created_at.desc())
        .all()
    )
    return [
        {
            "session_id": s.id,
            "amount": float(s.requested_amount),
            "expires_at": s.expires_at.isoformat(),
            "created_at": s.created_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/{session_id}/approve-simple")
def approve_simple(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simple web-app approval — no biometric required (learning project)."""
    expire_stale_sessions(db)
    session = get_session_or_404(db, session_id)
    if current_user.id != session.customer_id:
        raise HTTPException(status_code=403, detail="Only the session's customer can approve")
    if session.status != "pending":
        raise HTTPException(status_code=400, detail=f"Session is already {session.status}")
    approve_session(db, session, "web_simple")
    return {"message": "Session approved", "session_id": session.id}


@router.post("/{session_id}/decline")
def decline_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer declines a pending cash-out session."""
    session = get_session_or_404(db, session_id)
    if current_user.id != session.customer_id:
        raise HTTPException(status_code=403, detail="Only the session's customer can decline")
    if session.status != "pending":
        raise HTTPException(status_code=400, detail=f"Session is already {session.status}")
    session.status = "declined"
    db.commit()
    return {"message": "Session declined", "session_id": session.id}
