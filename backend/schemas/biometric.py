from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime


class BiometricEnrollBeginRequest(BaseModel):
    enrollment_type: str  # phone | agent_device
    bound_agent_id: Optional[int] = None  # required when enrollment_type = agent_device
    device_label: Optional[str] = None


class BiometricEnrollFinishRequest(BaseModel):
    enrollment_type: str
    bound_agent_id: Optional[int] = None
    device_label: Optional[str] = None
    credential: Dict[str, Any]  # WebAuthn RegistrationResponseJSON from browser


class BiometricVerifyBeginRequest(BaseModel):
    session_id: int


class BiometricVerifyFinishRequest(BaseModel):
    session_id: int
    credential: Dict[str, Any]  # WebAuthn AuthenticationResponseJSON from browser


class BiometricCredentialOut(BaseModel):
    id: int
    user_id: int
    credential_id: str
    enrollment_type: str
    bound_agent_id: Optional[int]
    device_label: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
