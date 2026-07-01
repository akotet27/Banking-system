import re
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    phone_number: str
    email: EmailStr
    password: str
    role: str = "customer"
    full_name: str
    date_of_birth: str  # YYYY-MM-DD
    location: str       # e.g. "Kigali, Gasabo"

    @field_validator("email")
    @classmethod
    def validate_email_deliverable(cls, v: str) -> str:
        try:
            from email_validator import validate_email as _ve, EmailNotValidError
            _ve(v, check_deliverability=False)
        except Exception as exc:
            name = type(exc).__name__
            if "EmailNotValidError" in name:
                raise ValueError(str(exc))
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+\d{10,15}$", v):
            raise ValueError("Phone must be E.164 format, e.g. +250788123456")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("customer",):
            raise ValueError("Role must be customer — agent and merchant status is applied for after registration")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 3:
            raise ValueError("Full name must be at least 3 characters")
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ '\-]+$", name):
            raise ValueError("Full name must contain only letters")
        return name

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        import re as _re
        if not _re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        return v


class UserOut(BaseModel):
    id: int
    phone_number: str
    email: str
    role: str
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None
    email_verified: bool
    kyc_status: str
    is_frozen: bool
    access_code: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str  # phone number OR email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    phone_number: str


class ResetPasswordRequest(BaseModel):
    phone_number: str
    code: str
    new_password: str
