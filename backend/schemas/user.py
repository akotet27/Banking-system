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

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+\d{10,15}$", v):
            raise ValueError("Phone must be E.164 format, e.g. +250788123456")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("customer", "agent", "merchant"):
            raise ValueError("Role must be customer, agent, or merchant")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("Full name must be at least 3 characters")
        return v.strip()

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
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None


class LoginRequest(BaseModel):
    phone_number: str
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
