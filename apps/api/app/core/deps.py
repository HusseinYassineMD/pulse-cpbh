"""FastAPI dependencies — dev mode skips sign-in."""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.security import decode_token, hash_password
from app.models import User, UserRole

security = HTTPBearer(auto_error=False)

DEV_EMAIL = "dev@pulse.local"


async def _get_or_create_dev_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == DEV_EMAIL))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        email=DEV_EMAIL,
        name="CPBH",
        hashed_password=hash_password("dev"),
        role=UserRole.ADMIN,
    )
    db.add(user)
    await db.flush()
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    settings = get_settings()

    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("type") == "access":
                user_id = UUID(payload["sub"])
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    return user
        except ValueError:
            pass

    if not settings.auth_enabled:
        return await _get_or_create_dev_user(db)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def require_roles(*roles: UserRole):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker
