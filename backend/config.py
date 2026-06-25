from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    database_url: str = "sqlite:///./ishimwe_bank.db"

    otp_expire_minutes: int = 10
    otp_rate_limit_per_hour: int = 5

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_sender: str = ""  # From address; falls back to smtp_user if empty

    webauthn_rp_id: str = "localhost"
    webauthn_origin: str = "http://localhost:5173"

    cash_out_fee_percentage: float = 1.0
    cash_out_min_fee: float = 5.0
    send_money_fee_percentage: float = 0.5
    send_money_min_fee: float = 1.0
    pay_merchant_fee_percentage: float = 0.3
    pay_merchant_min_fee: float = 0.5

    agent_commission_percentage: float = 30.0
    agent_device_cashout_max: float = 5000.0
    session_expire_minutes: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
