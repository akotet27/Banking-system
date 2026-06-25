# Ishimwe Bank

A learning project modeling Ethiopia's Telebirr mobile money system.
**Stack:** FastAPI · React 19 · Tailwind CSS v4 · SQLite

---

## Quick Start

### Backend

```bash
cd Banking-system/backend

# 1. Create a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env file and edit if needed (SMTP optional in dev)
copy .env.example .env

# 4. Run the server (from Banking-system/, not from backend/)
cd ..
uvicorn backend.main:app --reload
```

API runs at **http://localhost:8000** — interactive docs at **/docs**

> **Dev mode OTPs:** If SMTP is not configured, OTP codes are printed to the
> server console so you can test registration without a real email account.

### Frontend

```bash
cd Banking-system/front-end
pnpm install   # already done if node_modules exists
pnpm dev
```

App runs at **http://localhost:5173**

---

## Creating the first Admin account

SQLite doesn't have a seed script yet, so manually set role after registering:

```bash
# After registering a user via /auth/register + /auth/verify-email:
sqlite3 ishimwe_bank.db "UPDATE users SET role='admin' WHERE phone_number='+251911000000';"
```

---

## Running Tests

```bash
cd Banking-system/
python -m pytest backend/tests/ -v
```

---

## Architecture

See `PROJECT_SPEC.md` in the repo root for the full design rationale,
especially Section 5 (Privacy Session / WebAuthn) which explains the
security model in detail.

```
Banking-system/
├── backend/            FastAPI app
│   ├── models/         SQLAlchemy ORM (one file per table group)
│   ├── schemas/        Pydantic request/response schemas
│   ├── routers/        HTTP endpoints (one file per feature)
│   ├── services/       Business logic (ledger, fees, sessions, auth)
│   └── dependencies/   FastAPI dependency injection (auth, rate limiting)
└── front-end/          Vite + React 19 + Tailwind CSS v4
    └── src/
        ├── pages/      One page per screen
        ├── components/ Reusable UI pieces
        ├── api/        Backend API wrappers
        ├── contexts/   Auth state (AuthContext)
        └── utils/      Validation, formatting helpers
```
