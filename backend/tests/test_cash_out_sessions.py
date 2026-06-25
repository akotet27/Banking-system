"""Privacy session tests — creation, status transitions, balance privacy."""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..database import Base
from ..models.session import AgentSession
from ..models.user import User
from ..models.wallet import Wallet
from ..services.session_service import (
    approve_session,
    check_sufficient_balance,
    complete_session,
    create_session,
    expire_stale_sessions,
)

TEST_DB = "sqlite:///./test_sessions.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _user(db, phone, role="customer", balance=Decimal("1000")):
    u = User(phone_number=phone, email=f"{phone}@t.com", password_hash="x", role=role, email_verified=True)
    db.add(u)
    db.flush()
    w = Wallet(user_id=u.id, balance=balance, float_balance=Decimal("5000") if role == "agent" else None)
    db.add(w)
    db.commit()
    return u


def test_session_created_as_pending():
    db = Session()
    agent = _user(db, "+111", "agent")
    customer = _user(db, "+222")

    session = create_session(db, agent.id, customer.id, Decimal("500"))
    assert session.status == "pending"
    assert session.challenge_code
    assert session.expires_at > datetime.utcnow()
    db.close()


def test_session_approve_and_complete():
    db = Session()
    agent = _user(db, "+333", "agent")
    customer = _user(db, "+444")

    session = create_session(db, agent.id, customer.id, Decimal("200"))
    approve_session(db, session, "phone_webauthn")
    assert session.status == "approved"

    complete_session(db, session)
    assert session.status == "completed"
    db.close()


def test_sufficient_balance_yes():
    db = Session()
    agent = _user(db, "+555", "agent")
    customer = _user(db, "+666", balance=Decimal("5000"))

    session = create_session(db, agent.id, customer.id, Decimal("200"))
    approve_session(db, session, "phone_webauthn")
    assert check_sufficient_balance(db, session) is True
    db.close()


def test_sufficient_balance_no():
    db = Session()
    agent = _user(db, "+777", "agent")
    customer = _user(db, "+888", balance=Decimal("10"))

    session = create_session(db, agent.id, customer.id, Decimal("500"))
    approve_session(db, session, "phone_webauthn")
    # balance check returns bool, never the actual amount
    assert check_sufficient_balance(db, session) is False
    db.close()


def test_stale_sessions_expire():
    db = Session()
    agent = _user(db, "+999", "agent")
    customer = _user(db, "+000")

    session = create_session(db, agent.id, customer.id, Decimal("100"))
    # Force it into the past
    session.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.commit()

    expire_stale_sessions(db)
    db.refresh(session)
    assert session.status == "expired"
    db.close()
