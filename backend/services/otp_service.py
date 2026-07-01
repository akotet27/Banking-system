import logging
import secrets
import smtplib
import string
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from ..config import settings
from ..models.otp import OtpCode

logger = logging.getLogger(__name__)


def generate_otp_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def create_otp(db: Session, user_id: int, purpose: str) -> str:
    # Invalidate all prior unused OTPs for this user+purpose
    db.query(OtpCode).filter(
        OtpCode.user_id == user_id,
        OtpCode.purpose == purpose,
        OtpCode.used == False,  # noqa: E712
    ).update({"used": True})

    code = generate_otp_code()
    otp = OtpCode(
        user_id=user_id,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(otp)
    db.commit()
    return code


def verify_otp(db: Session, user_id: int, code: str, purpose: str) -> bool:
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.user_id == user_id,
            OtpCode.code == code,
            OtpCode.purpose == purpose,
            OtpCode.used == False,  # noqa: E712
            OtpCode.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not otp:
        return False

    otp.used = True
    db.commit()
    return True


def send_otp_email(email: str, code: str, purpose: str) -> None:
    subject_map = {
        "signup": "Verify your Ishimwe Bank account",
        "reset_password": "Reset your Ishimwe Bank password",
        "fallback_biometric_2fa": "Ishimwe Bank Cash Out Verification Code",
    }
    subject = subject_map.get(purpose, "Ishimwe Bank OTP")
    body = (
        f"Your verification code is: {code}\n\n"
        f"This code expires in {settings.otp_expire_minutes} minutes.\n\n"
        "If you did not request this, ignore this email."
    )

    if not settings.smtp_user:
        logger.warning("[OTP] SMTP not configured — code not delivered to %s (purpose: %s)", email, purpose)
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_sender or settings.smtp_user
    msg["To"] = email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("[OTP] Email delivered to %s (purpose: %s)", email, purpose)
    except Exception as exc:
        logger.error("[OTP] SMTP failed for %s (%s: %s)", email, type(exc).__name__, exc)
        raise
