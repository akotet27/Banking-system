from pydantic import BaseModel


class OtpVerifyRequest(BaseModel):
    phone_number: str
    code: str
    purpose: str = "signup"


class OtpResendRequest(BaseModel):
    phone_number: str
    purpose: str = "signup"
