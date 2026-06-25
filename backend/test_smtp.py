"""
Run from Banking-system/ folder:
  python -m backend.test_smtp you@example.com
"""
import smtplib
import sys
from email.mime.text import MIMEText

# Load settings the same way the app does
from backend.config import settings

def test(to_email: str):
    print(f"SMTP host : {settings.smtp_host}")
    print(f"SMTP port : {settings.smtp_port}")
    print(f"SMTP user : {settings.smtp_user}")
    print(f"SMTP from : {settings.smtp_sender or settings.smtp_user}")
    print(f"Sending test email to: {to_email}\n")

    msg = MIMEText("This is a test email from Ishimwe Bank SMTP test script.")
    msg["Subject"] = "Ishimwe Bank — SMTP test"
    msg["From"] = settings.smtp_sender or settings.smtp_user
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as s:
            print("Connected to SMTP server ✓")
            s.ehlo()
            s.starttls()
            print("STARTTLS OK ✓")
            s.ehlo()
            s.login(settings.smtp_user, settings.smtp_password)
            print("Login OK ✓")
            s.send_message(msg)
            print(f"Email sent to {to_email} ✓")
    except Exception as e:
        print(f"\nSMTP ERROR: {type(e).__name__}: {e}")
        print("\nPossible causes:")
        print("  - Wrong password in .env")
        print("  - Server requires SSL on port 465 instead of STARTTLS on 587")
        print("  - Firewall blocking outbound port 587")
        print("  - The mail server requires app-specific password")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m backend.test_smtp <your-email@example.com>")
        sys.exit(1)
    test(sys.argv[1])
