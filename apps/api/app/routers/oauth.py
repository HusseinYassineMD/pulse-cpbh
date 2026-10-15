"""OAuth connect for Meta (Instagram/Facebook) and LinkedIn."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Platform, SocialAccount, User
from app.services.oauth_linkedin import (
    discover_linkedin_org,
    exchange_linkedin_code,
    linkedin_authorize_url,
)
from app.services.oauth_meta import discover_meta_accounts, exchange_meta_code, meta_authorize_url
from app.services.oauth_state import make_oauth_state, parse_oauth_state

router = APIRouter(prefix="/oauth", tags=["oauth"])


class OAuthStartResponse(BaseModel):
    url: str


class PublishStatusResponse(BaseModel):
    dry_run: bool
    meta_configured: bool
    linkedin_configured: bool
    media_public_base: str
    ready_for_live_publish: bool
    notes: list[str]


async def _upsert_account(
    db: AsyncSession,
    user_id: UUID,
    platform: str,
    account_id: str,
    account_name: str,
    access_token: str,
) -> None:
    plat = Platform(platform)
    result = await db.execute(
        select(SocialAccount).where(SocialAccount.user_id == user_id, SocialAccount.platform == plat)
    )
    account = result.scalar_one_or_none()
    if account:
        account.account_id = account_id
        account.account_name = account_name
        account.access_token_enc = access_token
    else:
        db.add(
            SocialAccount(
                user_id=user_id,
                platform=plat,
                account_id=account_id,
                account_name=account_name,
                access_token_enc=access_token,
            )
        )


@router.get("/publish-status", response_model=PublishStatusResponse)
async def publish_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    result = await db.execute(select(SocialAccount).where(SocialAccount.user_id == user.id))
    accounts = result.scalars().all()
    platforms = {a.platform.value for a in accounts}

    notes: list[str] = []
    base = settings.media_public_base
    if base.startswith("http://127.0.0.1") or base.startswith("http://localhost"):
        notes.append(
            "Set PUBLISH_API_URL to a public HTTPS URL (e.g. ngrok) so Instagram can load your images."
        )
    if settings.publish_dry_run:
        notes.append("PUBLISH_DRY_RUN is true — Publish now simulates until you set PUBLISH_DRY_RUN=false.")
    if not settings.meta_app_id:
        notes.append("Add META_APP_ID and META_APP_SECRET in .env, then use Connect Meta below.")
    if not settings.linkedin_client_id:
        notes.append("Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET for LinkedIn OAuth.")

    ready = (
        not settings.publish_dry_run
        and len(accounts) > 0
        and not base.startswith("http://127.0.0.1")
        and not base.startswith("http://localhost")
    )

    return PublishStatusResponse(
        dry_run=settings.publish_dry_run,
        meta_configured=bool(settings.meta_app_id and settings.meta_app_secret),
        linkedin_configured=bool(settings.linkedin_client_id and settings.linkedin_client_secret),
        media_public_base=base,
        ready_for_live_publish=ready,
        notes=notes,
    )


@router.post("/meta/start", response_model=OAuthStartResponse)
async def meta_start(user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(status_code=400, detail="Configure META_APP_ID and META_APP_SECRET in .env")
    state = make_oauth_state(user.id)
    return OAuthStartResponse(url=meta_authorize_url(state))


@router.get("/meta/callback")
async def meta_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    web = settings.web_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(f"{web}/settings?oauth=meta&error=1")
    try:
        user_id = parse_oauth_state(state)
        token = await exchange_meta_code(code)
        accounts = await discover_meta_accounts(token)
        if not accounts:
            return RedirectResponse(f"{web}/settings?oauth=meta&error=no_pages")
        for acct in accounts:
            await _upsert_account(
                db,
                user_id,
                acct["platform"],
                acct["account_id"],
                acct["account_name"],
                acct["access_token"],
            )
        await db.flush()
        return RedirectResponse(f"{web}/settings?oauth=meta&ok=1")
    except Exception:
        return RedirectResponse(f"{web}/settings?oauth=meta&error=1")


@router.post("/linkedin/start", response_model=OAuthStartResponse)
async def linkedin_start(user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise HTTPException(status_code=400, detail="Configure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env")
    state = make_oauth_state(user.id)
    return OAuthStartResponse(url=linkedin_authorize_url(state))


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    web = settings.web_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(f"{web}/settings?oauth=linkedin&error=1")
    try:
        user_id = parse_oauth_state(state)
        token = await exchange_linkedin_code(code)
        org = await discover_linkedin_org(token)
        if not org:
            return RedirectResponse(f"{web}/settings?oauth=linkedin&error=no_org")
        await _upsert_account(
            db,
            user_id,
            org["platform"],
            org["account_id"],
            org["account_name"],
            org["access_token"],
        )
        await db.flush()
        return RedirectResponse(f"{web}/settings?oauth=linkedin&ok=1")
    except Exception:
        return RedirectResponse(f"{web}/settings?oauth=linkedin&error=1")
