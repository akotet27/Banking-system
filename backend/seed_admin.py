"""
Run once from the Banking-system/ directory to create the first admin account.

    .venv\Scripts\python -m backend.seed_admin
"""

from .database import engine, SessionLocal
from .models import User, Wallet
from . import models  # ensure all tables are registered
from sqlalchemy import inspect
from .services.auth_service import hash_password

ADMIN_PHONE = "+250788000000"
ADMIN_EMAIL = "admin@ishimwebank.rw"
ADMIN_PASSWORD = "Admin1234!"


def main():
    # Create tables if they don't exist yet
    from .database import Base
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.phone_number == ADMIN_PHONE).first()
        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                existing.email_verified = True
                existing.kyc_status = "verified"
                db.commit()
                print(f"Existing user upgraded to admin: {ADMIN_PHONE}")
            else:
                print(f"Admin already exists: {ADMIN_PHONE}")
            return

        admin = User(
            phone_number=ADMIN_PHONE,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
            email_verified=True,
            kyc_status="verified",
        )
        db.add(admin)
        db.flush()

        db.add(Wallet(user_id=admin.id, balance=0))
        db.commit()

        print("Admin created successfully:")
        print(f"  Phone:    {ADMIN_PHONE}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print("Change the password after first login.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
