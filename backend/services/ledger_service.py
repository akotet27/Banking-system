from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..models.wallet import Wallet
from .fee_service import calculate_fee


def _get_wallet_for_update(db: Session, user_id: int) -> Wallet:
    wallet = (
        db.query(Wallet)
        .filter(Wallet.user_id == user_id)
        .with_for_update()
        .first()
    )
    if not wallet:
        raise HTTPException(status_code=404, detail=f"Wallet not found for user {user_id}")
    return wallet


def _idempotent_lookup(db: Session, key: str) -> Transaction | None:
    return db.query(Transaction).filter(Transaction.idempotency_key == key).first()


def process_cash_in(
    db: Session,
    agent_id: int,
    customer_id: int,
    amount: Decimal,
    idempotency_key: str,
) -> Transaction:
    if existing := _idempotent_lookup(db, idempotency_key):
        return existing

    fee = calculate_fee(db, "cash_in", amount)
    total_debit = amount + fee

    try:
        agent_wallet = _get_wallet_for_update(db, agent_id)
        customer_wallet = _get_wallet_for_update(db, customer_id)

        agent_float = Decimal(str(agent_wallet.float_balance or 0))
        if agent_float < total_debit:
            raise HTTPException(status_code=400, detail="Insufficient agent float balance")

        agent_wallet.float_balance = agent_float - total_debit
        customer_wallet.balance = Decimal(str(customer_wallet.balance)) + amount

        txn = Transaction(
            type="cash_in",
            initiator_id=agent_id,
            counterparty_id=customer_id,
            amount=amount,
            fee=fee,
            fee_paid_by="agent" if fee > Decimal("0") else "n/a",
            net_amount=amount,
            idempotency_key=idempotency_key,
            status="completed",
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except IntegrityError:
        db.rollback()
        return _idempotent_lookup(db, idempotency_key) or (_ for _ in ()).throw(  # type: ignore
            HTTPException(status_code=500, detail="Transaction conflict")
        )


def process_cash_out(
    db: Session,
    agent_id: int,
    customer_id: int,
    amount: Decimal,
    session_id: int,
    idempotency_key: str,
) -> Transaction:
    if existing := _idempotent_lookup(db, idempotency_key):
        return existing

    fee = calculate_fee(db, "cash_out", amount)
    total_debit = amount + fee

    try:
        customer_wallet = _get_wallet_for_update(db, customer_id)
        agent_wallet = _get_wallet_for_update(db, agent_id)

        if Decimal(str(customer_wallet.balance)) < total_debit:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        customer_wallet.balance = Decimal(str(customer_wallet.balance)) - total_debit
        agent_wallet.float_balance = Decimal(str(agent_wallet.float_balance or 0)) + amount

        txn = Transaction(
            type="cash_out",
            initiator_id=customer_id,
            counterparty_id=agent_id,
            amount=amount,
            fee=fee,
            fee_paid_by="customer",
            net_amount=amount,
            session_id=session_id,
            idempotency_key=idempotency_key,
            status="completed",
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except IntegrityError:
        db.rollback()
        if existing := _idempotent_lookup(db, idempotency_key):
            return existing
        raise


def process_send_money(
    db: Session,
    sender_id: int,
    recipient_id: int,
    amount: Decimal,
    idempotency_key: str,
) -> tuple[Transaction, Transaction]:
    if existing := _idempotent_lookup(db, idempotency_key):
        related = (
            db.query(Transaction)
            .filter(Transaction.related_transaction_id == existing.id)
            .first()
        )
        return existing, related  # type: ignore

    fee = calculate_fee(db, "send_money", amount)
    total_debit = amount + fee

    try:
        sender_wallet = _get_wallet_for_update(db, sender_id)
        recipient_wallet = _get_wallet_for_update(db, recipient_id)

        if Decimal(str(sender_wallet.balance)) < total_debit:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        sender_wallet.balance = Decimal(str(sender_wallet.balance)) - total_debit
        recipient_wallet.balance = Decimal(str(recipient_wallet.balance)) + amount

        debit = Transaction(
            type="send_money",
            initiator_id=sender_id,
            counterparty_id=recipient_id,
            amount=amount,
            fee=fee,
            fee_paid_by="customer",
            net_amount=total_debit,
            idempotency_key=idempotency_key,
            status="completed",
        )
        db.add(debit)
        db.flush()

        credit = Transaction(
            type="send_money",
            initiator_id=sender_id,
            counterparty_id=recipient_id,
            amount=amount,
            fee=Decimal("0"),
            fee_paid_by="n/a",
            net_amount=amount,
            related_transaction_id=debit.id,
            status="completed",
        )
        db.add(credit)
        db.flush()

        debit.related_transaction_id = credit.id
        db.commit()
        db.refresh(debit)
        db.refresh(credit)
        return debit, credit
    except IntegrityError:
        db.rollback()
        raise


def process_pay_merchant(
    db: Session,
    customer_id: int,
    merchant_id: int,
    amount: Decimal,
    idempotency_key: str,
) -> Transaction:
    if existing := _idempotent_lookup(db, idempotency_key):
        return existing

    fee = calculate_fee(db, "pay_merchant", amount)
    merchant_receives = amount - fee

    try:
        customer_wallet = _get_wallet_for_update(db, customer_id)
        merchant_wallet = _get_wallet_for_update(db, merchant_id)

        if Decimal(str(customer_wallet.balance)) < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        customer_wallet.balance = Decimal(str(customer_wallet.balance)) - amount
        merchant_wallet.balance = Decimal(str(merchant_wallet.balance)) + merchant_receives

        txn = Transaction(
            type="pay_merchant",
            initiator_id=customer_id,
            counterparty_id=merchant_id,
            amount=amount,
            fee=fee,
            fee_paid_by="merchant",
            net_amount=merchant_receives,
            idempotency_key=idempotency_key,
            status="completed",
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except IntegrityError:
        db.rollback()
        raise
