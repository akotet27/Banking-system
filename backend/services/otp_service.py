import logging
import secrets
import smtplib
import string
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
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


def send_login_notification(email: str, name: str) -> None:
    if not settings.smtp_user:
        return
    now = datetime.utcnow().strftime("%d %b %Y at %H:%M UTC")
    subject = "New sign-in to your Ishimwe Bank account"
    body_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
      <div style="background:#0B1D3E;padding:20px 24px;border-radius:10px;margin-bottom:24px">
        <span style="color:#f97316;font-size:22px;font-weight:900">IB</span>
        <span style="color:#fff;font-size:18px;font-weight:700;margin-left:10px">Ishimwe Bank</span>
      </div>
      <h2 style="color:#0f172a;margin:0 0 8px">New sign-in detected</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi <b>{name}</b>, we noticed a new sign-in to your account.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Date &amp; Time</p>
        <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600">{now}</p>
      </div>
      <p style="color:#64748b;font-size:13px">If this was you, no action is needed. If you didn&apos;t sign in,
      <b style="color:#ef4444">change your password immediately</b> and contact support.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="color:#94a3b8;font-size:12px;text-align:center">&copy; 2026 Ishimwe Bank</p>
    </div>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_sender or settings.smtp_user
    msg["To"] = email
    msg.attach(MIMEText(body_html, "html"))
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo(); server.starttls(); server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as exc:
        logger.warning("[Login] Notification email failed for %s: %s", email, exc)


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
