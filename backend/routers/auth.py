from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.wallet import Wallet
from ..schemas.otp import OtpResendRequest, OtpVerifyRequest
from ..schemas.user import ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, TokenResponse, UserCreate, UserOut
from ..services.auth_service import create_access_token, hash_password, verify_password
from ..services.otp_service import create_otp, send_otp_email, verify_otp

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing_phone = db.query(User).filter(User.phone_number == payload.phone_number).first()
    existing_email = db.query(User).filter(User.email == payload.email).first()

    # If account exists and is already verified, reject
    if existing_phone and existing_phone.email_verified:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if existing_email and existing_email.email_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    # If unverified account exists for this phone, update it and resend OTP (resume flow)
    if existing_phone and not existing_phone.email_verified:
        existing_phone.email = payload.email
        existing_phone.password_hash = hash_password(payload.password)
        existing_phone.full_name = payload.full_name
        existing_phone.date_of_birth = payload.date_of_birth
        existing_phone.location = payload.location
        db.commit()
        db.refresh(existing_phone)
        code = create_otp(db, existing_phone.id, "signup")
        try:
            send_otp_email(existing_phone.email, code, "signup")
        except Exception:
            pass
        return existing_phone

    user = User(
        phone_number=payload.phone_number,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        location=payload.location,
    )
    db.add(user)
    db.flush()  # get user.id without committing

    wallet = Wallet(
        user_id=user.id,
        balance=0,
        float_balance=0 if payload.role == "agent" else None,
    )
    db.add(wallet)
    db.commit()
    db.refresh(user)

    code = create_otp(db, user.id, "signup")
    try:
        send_otp_email(user.email, code, "signup")
    except Exception:
        pass  # dev mode already printed; don't fail the registration

    return user


@router.post("/verify-email")
def verify_email(payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_otp(db, user.id, payload.code, "signup"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.email_verified = True
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-otp")
def resend_otp(payload: OtpResendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = create_otp(db, user.id, payload.purpose)
    try:
        send_otp_email(user.email, code, payload.purpose)
    except Exception:
        pass

    return {"message": "OTP sent"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    if user.is_frozen:
        raise HTTPException(status_code=403, detail="Account is frozen")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if user and user.email_verified:
        code = create_otp(db, user.id, "reset_password")
        try:
            send_otp_email(user.email, code, "reset_password")
        except Exception:
            pass
    # Always return success to avoid leaking whether a phone number is registered
    return {"message": "If that number is registered, a reset code was sent to the associated email."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if not verify_otp(db, user.id, payload.code, "reset_password"):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully. Please sign in with your new password."}
