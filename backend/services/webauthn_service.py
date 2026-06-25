"""
WebAuthn service — wraps py-webauthn (pip install py-webauthn).

Key design from the spec (Section 5):
  - The raw fingerprint NEVER leaves the device secure chip.
  - We only store the WebAuthn public key (not anything biometric).
  - Every verification is a challenge-response: server sends random bytes,
    device signs them with the locked private key only if fingerprint passes
    internally, server verifies the signature with the stored public key.
  - If py-webauthn is not installed, a dev-mode fallback is used so the
    rest of the system can still be exercised without real hardware.
"""

import base64
import json
import logging
import secrets
from typing import Any

from ..config import settings

logger = logging.getLogger(__name__)

RP_ID = settings.webauthn_rp_id
RP_NAME = "Ishimwe Bank"
ORIGIN = settings.webauthn_origin


def _b64_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def _b64_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def begin_registration(
    user_id: int,
    phone_number: str,
    existing_credential_ids: list[str],
) -> dict[str, Any]:
    try:
        from webauthn import generate_registration_options
        from webauthn.helpers import options_to_json
        from webauthn.helpers.structs import (
            AuthenticatorSelectionCriteria,
            PublicKeyCredentialDescriptor,
            ResidentKeyRequirement,
            UserVerificationRequirement,
        )

        exclude = [
            PublicKeyCredentialDescriptor(id=_b64_decode(cid))
            for cid in existing_credential_ids
        ]
        opts = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user_id).encode(),
            user_name=phone_number,
            exclude_credentials=exclude,
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.REQUIRED,
                resident_key=ResidentKeyRequirement.DISCOURAGED,
            ),
        )
        return json.loads(options_to_json(opts))

    except ImportError:
        logger.warning("py-webauthn not installed — using dev-mode stub")
        return {
            "challenge": secrets.token_urlsafe(32),
            "rp": {"id": RP_ID, "name": RP_NAME},
            "user": {"id": _b64_encode(str(user_id).encode()), "name": phone_number},
            "pubKeyCredParams": [{"type": "public-key", "alg": -7}],
            "timeout": 60000,
            "_dev_mode": True,
        }


def finish_registration(
    expected_challenge_b64: str,
    credential_response: dict[str, Any],
) -> dict[str, Any]:
    try:
        from webauthn import verify_registration_response
        from webauthn.helpers.structs import RegistrationCredential

        cred = RegistrationCredential.parse_raw(json.dumps(credential_response))
        verification = verify_registration_response(
            credential=cred,
            expected_challenge=_b64_decode(expected_challenge_b64),
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            require_user_verification=True,
        )
        return {
            "credential_id": _b64_encode(verification.credential_id),
            "public_key": _b64_encode(verification.credential_public_key),
            "sign_count": verification.sign_count,
        }

    except ImportError:
        logger.warning("py-webauthn not installed — returning dev-mode stub credential")
        return {
            "credential_id": secrets.token_urlsafe(32),
            "public_key": secrets.token_urlsafe(64),
            "sign_count": 0,
        }


# ---------------------------------------------------------------------------
# Authentication (used during Cash Out session approval)
# ---------------------------------------------------------------------------

def begin_authentication(
    credential_ids: list[str],
    challenge: str,
) -> dict[str, Any]:
    try:
        from webauthn import generate_authentication_options
        from webauthn.helpers import options_to_json
        from webauthn.helpers.structs import (
            PublicKeyCredentialDescriptor,
            UserVerificationRequirement,
        )

        allow = [
            PublicKeyCredentialDescriptor(id=_b64_decode(cid))
            for cid in credential_ids
        ]
        opts = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow,
            user_verification=UserVerificationRequirement.REQUIRED,
            challenge=challenge.encode(),
        )
        return json.loads(options_to_json(opts))

    except ImportError:
        return {
            "challenge": challenge,
            "rpId": RP_ID,
            "timeout": 60000,
            "allowCredentials": [{"id": cid, "type": "public-key"} for cid in credential_ids],
            "_dev_mode": True,
        }


def finish_authentication(
    credential_response: dict[str, Any],
    expected_challenge: str,
    stored_public_key_b64: str,
    current_sign_count: int,
) -> bool:
    try:
        from webauthn import verify_authentication_response
        from webauthn.helpers.structs import AuthenticationCredential

        cred = AuthenticationCredential.parse_raw(json.dumps(credential_response))
        verification = verify_authentication_response(
            credential=cred,
            expected_challenge=expected_challenge.encode(),
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            credential_public_key=_b64_decode(stored_public_key_b64),
            credential_current_sign_count=current_sign_count,
            require_user_verification=True,
        )
        return verification.verified

    except ImportError:
        logger.warning("py-webauthn not installed — auto-approving in dev mode")
        return True
