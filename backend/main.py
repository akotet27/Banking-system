from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import settings
from .database import Base, engine
from .dependencies.rate_limit import limiter

# Import all models so Base.metadata knows about every table before create_all
from .models import (  # noqa: F401
    AgentApplication,
    AgentSession,
    BiometricCredential,
    Contact,
    FeeRule,
    FloatRequest,
    KycRequest,
    MerchantApplication,
    OtpCode,
    SessionAuditLog,
    Transaction,
    User,
    Wallet,
)
from .routers import (
    admin,
    agents,
    auth,
    biometric,
    cash_in,
    cash_out,
    contacts,
    kyc,
    merchants,
    pay_merchant,
    send_money,
    sessions,
    users,
    wallets,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Ishimwe Bank API",
    description=(
        "Mobile money system API — modeled on Telebirr. "
        "See /docs for interactive exploration."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(wallets.router)
app.include_router(kyc.router)
app.include_router(agents.router)
app.include_router(merchants.router)
app.include_router(biometric.router)
app.include_router(cash_in.router)
app.include_router(cash_out.router)
app.include_router(send_money.router)
app.include_router(pay_merchant.router)
app.include_router(sessions.router)
app.include_router(contacts.router)
app.include_router(admin.router)


UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/", tags=["root"])
def root():
    return {"message": "Ishimwe Bank API is running", "docs": "/docs"}
