"""Phase 1 auth tests — registration, OTP verification, login."""

import pytest
from fastapi.testclient import TestClient

CUSTOMER = {
    "phone_number": "+250788000001",
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "role": "customer",
}


def test_register_creates_user(client: TestClient):
    res = client.post("/auth/register", json=CUSTOMER)
    assert res.status_code == 201
    data = res.json()
    assert data["phone_number"] == CUSTOMER["phone_number"]
    assert data["email_verified"] is False
    assert data["role"] == "customer"


def test_register_duplicate_phone(client: TestClient):
    client.post("/auth/register", json=CUSTOMER)
    res = client.post("/auth/register", json=CUSTOMER)
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


def test_register_duplicate_email(client: TestClient):
    client.post("/auth/register", json=CUSTOMER)
    res = client.post(
        "/auth/register",
        json={**CUSTOMER, "phone_number": "+250788000002"},
    )
    assert res.status_code == 400


def test_login_before_verification_fails(client: TestClient):
    client.post("/auth/register", json=CUSTOMER)
    res = client.post(
        "/auth/login",
        json={"phone_number": CUSTOMER["phone_number"], "password": CUSTOMER["password"]},
    )
    assert res.status_code == 403
    assert "not verified" in res.json()["detail"]


def test_login_wrong_password(client: TestClient):
    client.post("/auth/register", json=CUSTOMER)
    res = client.post(
        "/auth/login",
        json={"phone_number": CUSTOMER["phone_number"], "password": "wrong"},
    )
    assert res.status_code == 401


def test_full_register_verify_login_flow(client: TestClient, monkeypatch):
    """Register → grab OTP from DB → verify → login → get /users/me."""
    from backend.database import get_db as real_get_db
    from backend.models.otp import OtpCode

    client.post("/auth/register", json=CUSTOMER)

    # Grab OTP directly from test DB (bypassing email)
    db = next(real_get_db())
    try:
        from backend.models.user import User
        user = db.query(User).filter(User.phone_number == CUSTOMER["phone_number"]).first()
        otp = db.query(OtpCode).filter(
            OtpCode.user_id == user.id,
            OtpCode.purpose == "signup",
            OtpCode.used == False,
        ).first()
        code = otp.code
    finally:
        db.close()

    res = client.post(
        "/auth/verify-email",
        json={"phone_number": CUSTOMER["phone_number"], "code": code, "purpose": "signup"},
    )
    assert res.status_code == 200

    res = client.post(
        "/auth/login",
        json={"phone_number": CUSTOMER["phone_number"], "password": CUSTOMER["password"]},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["phone_number"] == CUSTOMER["phone_number"]
