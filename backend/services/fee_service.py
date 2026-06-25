from decimal import Decimal

from sqlalchemy.orm import Session

from ..models.fee_rule import FeeRule

_DEFAULTS: dict[str, dict] = {
    "cash_in":      {"pct": Decimal("0"),   "min": Decimal("0"),   "max": None},
    "cash_out":     {"pct": Decimal("1.0"), "min": Decimal("5.0"), "max": None},
    "send_money":   {"pct": Decimal("0.5"), "min": Decimal("1.0"), "max": None},
    "pay_merchant": {"pct": Decimal("0.3"), "min": Decimal("0.5"), "max": None},
}


def calculate_fee(db: Session, transaction_type: str, amount: Decimal) -> Decimal:
    rule = (
        db.query(FeeRule)
        .filter(FeeRule.transaction_type == transaction_type)
        .first()
    )

    if rule:
        pct = Decimal(str(rule.fee_percentage))
        min_fee = Decimal(str(rule.min_fee)) if rule.min_fee is not None else Decimal("0")
        max_fee = Decimal(str(rule.max_fee)) if rule.max_fee is not None else None
    else:
        d = _DEFAULTS.get(transaction_type, {"pct": Decimal("0"), "min": Decimal("0"), "max": None})
        pct, min_fee, max_fee = d["pct"], d["min"], d["max"]

    fee = (amount * pct / Decimal("100")).quantize(Decimal("0.01"))
    fee = max(fee, min_fee)
    if max_fee is not None:
        fee = min(fee, max_fee)

    return fee
