"""Ledger service tests — atomicity, fees, idempotency."""

from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..database import Base
from ..models.user import User
from ..models.wallet import Wallet
from ..services.ledger_service import (
    process_cash_in,
    process_pay_merchant,
    process_send_money,
)

TEST_DB = "sqlite:///./test_ledger.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _make_user(db, phone, role="customer"):
    u = User(
        phone_number=phone,
        email=f"{phone}@test.com",
        password_hash="x",
        role=role,
        email_verified=True,
    )
    db.add(u)
    db.flush()
    float_bal = Decimal("10000") if role == "agent" else None
    w = Wallet(user_id=u.id, balance=Decimal("1000"), float_balance=float_bal)
    db.add(w)
    db.commit()
    return u


def test_cash_in_moves_balances():
    db = Session()
    agent = _make_user(db, "+2507880", "agent")
    customer = _make_user(db, "+2507881")
    initial_customer = Decimal(str(db.query(Wallet).filter_by(user_id=customer.id).first().balance))

    process_cash_in(db, agent.id, customer.id, Decimal("500"), "key-1")

    agent_wallet = db.query(Wallet).filter_by(user_id=agent.id).first()
    customer_wallet = db.query(Wallet).filter_by(user_id=customer.id).first()

    assert Decimal(str(agent_wallet.float_balance)) == Decimal("9500")
    assert Decimal(str(customer_wallet.balance)) == initial_customer + Decimal("500")
    db.close()


def test_cash_in_idempotent():
    db = Session()
    agent = _make_user(db, "+2507882", "agent")
    customer = _make_user(db, "+2507883")

    t1 = process_cash_in(db, agent.id, customer.id, Decimal("100"), "idem-1")
    t2 = process_cash_in(db, agent.id, customer.id, Decimal("100"), "idem-1")
    assert t1.id == t2.id
    db.close()


def test_send_money_applies_fee():
    db = Session()
    sender = _make_user(db, "+2507884")
    recipient = _make_user(db, "+2507885")

    debit, _ = process_send_money(db, sender.id, recipient.id, Decimal("200"), "sm-1")
    assert debit.fee > Decimal("0")

    sender_wallet = db.query(Wallet).filter_by(user_id=sender.id).first()
    assert Decimal(str(sender_wallet.balance)) == Decimal("1000") - Decimal("200") - debit.fee
    db.close()


def test_send_money_insufficient_balance():
    from fastapi import HTTPException

    db = Session()
    sender = _make_user(db, "+2507886")
    recipient = _make_user(db, "+2507887")

    with pytest.raises(HTTPException) as exc:
        process_send_money(db, sender.id, recipient.id, Decimal("99999"), "sm-2")
    assert exc.value.status_code == 400
    db.close()


def test_pay_merchant_fee_paid_by_merchant():
    db = Session()
    customer = _make_user(db, "+2507888")
    merchant = _make_user(db, "+2507889", "merchant")

    txn = process_pay_merchant(db, customer.id, merchant.id, Decimal("300"), "pm-1")
    assert txn.fee_paid_by == "merchant"

    customer_wallet = db.query(Wallet).filter_by(user_id=customer.id).first()
    merchant_wallet = db.query(Wallet).filter_by(user_id=merchant.id).first()

    assert Decimal(str(customer_wallet.balance)) == Decimal("700")
    assert Decimal(str(merchant_wallet.balance)) == Decimal("1000") + (Decimal("300") - txn.fee)
    db.close()
