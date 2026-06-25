from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..services.auth_service import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise exc
    except PyJWTError:
        raise exc

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise exc
    if user.is_frozen:
        raise HTTPException(status_code=403, detail="Account is frozen")
    return user


def require_role(*roles: str):
    """Factory that returns a dependency enforcing role membership."""
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access requires role: {', '.join(roles)}",
            )
        return current_user
    return _check


def require_verified_email(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your email first.")
    return current_user
