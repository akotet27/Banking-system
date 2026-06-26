# Ishimwe Bank

A full-stack mobile money web application inspired by Rwanda's mobile banking ecosystem. Users can send money, deposit and withdraw cash through agents, pay merchants, and manage their wallets — all with privacy-first session security that keeps balances invisible to agents.

**Stack:** FastAPI · React 19 · Tailwind CSS v4 · SQLite

---

## Features

- **User registration & OTP email verification**
- **Send Money** — instant peer-to-peer transfers by phone number
- **Cash In / Cash Out** — deposit and withdraw through a licensed agent network
- **Pay Merchant** — QR-style merchant payments
- **KYC verification** — identity document upload and approval flow
- **Privacy sessions** — agents see only a yes/no approval, never the customer's balance
- **Agent portal** — dedicated dashboard for cash-in/out operations and commissions
- **Admin portal** — user management, KYC/agent/merchant approvals, fee rules, and audit logs
- **Biometric authentication** — WebAuthn passkey support
- **Rate limiting** — per-endpoint request throttling via SlowAPI

---

## Quick Start

### Backend

```bash
cd Banking-system-1/backend

# 1. Create a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env file and edit if needed (SMTP optional in dev)
copy .env.example .env

# 4. Run the server (from the repo root, not from backend/)
cd ..
uvicorn backend.main:app --reload
```

API runs at **http://localhost:8000** — interactive docs at **/docs**

> **Dev mode OTPs:** If SMTP is not configured, OTP codes are printed to the server console so you can test registration without a real email account.

### Frontend

```bash
cd Banking-system-1/front-end
pnpm install
pnpm dev
```

App runs at **http://localhost:5173**

---

## Creating the First Admin Account

SQLite has no seed script yet. After registering a user via `/auth/register` + `/auth/verify-email`, promote them manually:

```bash
sqlite3 ishimwe_bank.db "UPDATE users SET role='admin' WHERE phone_number='+250788000000';"
```

---

## Running Tests

```bash
cd Banking-system-1/
python -m pytest backend/tests/ -v
```

---

## File Structure

```
Banking-system-1/
│
├── backend/                        FastAPI application
│   ├── main.py                     App entry point, router registration, CORS
│   ├── database.py                 SQLAlchemy engine and session setup
│   ├── config.py                   Settings loaded from .env
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── models/                     SQLAlchemy ORM models
│   │   ├── user.py                 User accounts and roles
│   │   ├── wallet.py               Wallet balances
│   │   ├── transaction.py          Ledger entries
│   │   ├── otp.py                  One-time password codes
│   │   ├── kyc.py                  KYC verification requests
│   │   ├── session.py              Privacy sessions and audit logs
│   │   ├── biometric.py            WebAuthn passkey credentials
│   │   ├── applications.py         Agent and merchant applications
│   │   └── fee_rule.py             Configurable transaction fee rules
│   │
│   ├── schemas/                    Pydantic request / response schemas
│   │
│   ├── routers/                    HTTP endpoints (one file per feature)
│   │   ├── auth.py                 Register, login, OTP, password reset
│   │   ├── users.py                Profile, phone update
│   │   ├── wallets.py              Balance enquiry
│   │   ├── send_money.py           P2P transfers
│   │   ├── cash_in.py              Agent deposits
│   │   ├── cash_out.py             Agent withdrawals
│   │   ├── pay_merchant.py         Merchant payments
│   │   ├── kyc.py                  KYC submission and status
│   │   ├── agents.py               Agent application and management
│   │   ├── merchants.py            Merchant application and management
│   │   ├── sessions.py             Privacy session lifecycle
│   │   ├── biometric.py            WebAuthn registration and assertion
│   │   └── admin.py                Admin-only management endpoints
│   │
│   └── dependencies/               FastAPI dependency injection
│       ├── auth.py                 JWT token verification
│       └── rate_limit.py           SlowAPI limiter instance
│
└── front-end/                      Vite + React 19 + Tailwind CSS v4
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                 Route definitions
        │
        ├── pages/                  One component per screen
        │   ├── LandingPage.jsx     Marketing home page
        │   ├── LoginPage.jsx       User sign-in
        │   ├── RegisterPage.jsx    Account creation + OTP step
        │   ├── ForgotPasswordPage.jsx
        │   ├── DashboardPage.jsx   Balance, quick actions, recent transactions
        │   ├── SendMoneyPage.jsx   P2P transfer form
        │   ├── CashInPage.jsx      Agent deposit
        │   ├── CashOutPage.jsx     Agent withdrawal with privacy session
        │   ├── PayMerchantPage.jsx Merchant payment
        │   ├── HistoryPage.jsx     Full transaction history
        │   ├── KycPage.jsx         Identity verification upload
        │   ├── ProfilePage.jsx     Account settings
        │   ├── AgentDashboardPage.jsx
        │   ├── AgentCommissionPage.jsx
        │   ├── AdminLoginPage.jsx
        │   ├── AdminDashboardPage.jsx
        │   ├── AdminUsersPage.jsx
        │   ├── AdminApprovalsPage.jsx
        │   ├── AdminFeeRulesPage.jsx
        │   └── AdminAuditLogPage.jsx
        │
        ├── components/             Reusable UI pieces
        │   ├── AppLayout.jsx
        │   ├── SidebarLayout.jsx
        │   ├── BalanceCard.jsx
        │   ├── TransactionList.jsx
        │   ├── SessionStatusBadge.jsx
        │   ├── BiometricPrompt.jsx
        │   ├── PageHeader.jsx
        │   ├── Logo.jsx
        │   └── Icons.jsx
        │
        ├── api/                    Axios wrappers for backend endpoints
        │   ├── authApi.js
        │   ├── walletApi.js
        │   ├── transactionApi.js
        │   ├── sessionApi.js
        │   └── biometricApi.js
        │
        ├── contexts/
        │   ├── AuthContext.jsx     Global auth state (user, token, logout)
        │   └── ThemeContext.jsx
        │
        └── utils/
            ├── validation.js       Phone / amount input rules
            └── webauthn.js         WebAuthn helpers
```

---

## Screenshots

### Landing Page
![Landing Page](docs/screenshots/landing.png)

### User Dashboard
![User Dashboard](docs/screenshots/dashboard.png)

### Send Money
![Send Money](docs/screenshots/send-money.png)

### Cash Out (Privacy Session)
![Cash Out](docs/screenshots/cash-out.png)

### Transaction History
![History](docs/screenshots/history.png)

### KYC Verification
![KYC](docs/screenshots/kyc.png)

### Agent Dashboard
![Agent Dashboard](docs/screenshots/agent-dashboard.png)

### Admin Dashboard
![Admin Dashboard](docs/screenshots/admin-dashboard.png)

### Admin — User Management
![Admin Users](docs/screenshots/admin-users.png)

### Admin — Fee Rules
![Admin Fee Rules](docs/screenshots/admin-fee-rules.png)

> **Note:** Add real screenshots to `docs/screenshots/` and commit them to update the images above.

---

## Architecture Notes

- **Privacy sessions** — when a customer initiates a cash-out, a short-lived session token is generated. The agent scans the token; the API returns only an approval status, keeping the customer's balance hidden from the agent at all times.
- **Ledger model** — all money movement is recorded as double-entry transactions so the wallet balance is always derivable from the ledger.
- **Role-based access** — three roles: `user`, `agent`, `admin`. FastAPI dependencies enforce role checks on every protected route.
- **Fee engine** — `FeeRule` rows in the database drive transaction fees; admins can update rules without a code deploy.

See `PROJECT_SPEC.md` for the full design rationale, particularly Section 5 (Privacy Session / WebAuthn).
