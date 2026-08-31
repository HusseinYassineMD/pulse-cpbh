"""Connect social media accounts (paste tokens for now)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Platform, SocialAccount, User

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountCreate(BaseModel):
    platform: Platform
    account_id: str
    account_name: str
    access_token: str


class AccountResponse(BaseModel):
    id: UUID
    platform: Platform
    account_id: str
    account_name: str
    connected: bool = True

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AccountResponse])
async def list_accounts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SocialAccount).where(SocialAccount.user_id == user.id))
    return result.scalars().all()


@router.post("", response_model=AccountResponse, status_code=201)
async def connect_account(
    body: AccountCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(SocialAccount).where(
            SocialAccount.user_id == user.id,
            SocialAccount.platform == body.platform,
        )
    )
    account = existing.scalar_one_or_none()

    if account:
        account.account_id = body.account_id
        account.account_name = body.account_name
        account.access_token_enc = body.access_token
    else:
        account = SocialAccount(
            user_id=user.id,
            platform=body.platform,
            account_id=body.account_id,
            account_name=body.account_name,
            access_token_enc=body.access_token,
        )
        db.add(account)

    await db.flush()
    return account


@router.delete("/{account_id}", status_code=204)
async def disconnect_account(
    account_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SocialAccount).where(SocialAccount.id == account_id, SocialAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
