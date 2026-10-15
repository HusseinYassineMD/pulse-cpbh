"""Meta (Facebook + Instagram) OAuth and account discovery."""

from __future__ import annotations

import httpx

from app.config import get_settings

META_SCOPES = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
    "business_management",
]


def meta_authorize_url(state: str) -> str:
    settings = get_settings()
    if not settings.meta_app_id:
        raise ValueError("META_APP_ID is not configured")
    scope = ",".join(META_SCOPES)
    redirect = settings.meta_redirect_uri
    return (
        "https://www.facebook.com/v21.0/dialog/oauth"
        f"?client_id={settings.meta_app_id}"
        f"&redirect_uri={redirect}"
        f"&state={state}"
        f"&scope={scope}"
        "&response_type=code"
    )


async def exchange_meta_code(code: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://graph.facebook.com/v21.0/oauth/access_token",
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "redirect_uri": settings.meta_redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise ValueError("No access token in Meta response")
        return token


async def discover_meta_accounts(user_access_token: str) -> list[dict]:
    """Return [{platform, account_id, account_name, access_token}, ...]."""
    out: list[dict] = []
    async with httpx.AsyncClient() as client:
        pages_resp = await client.get(
            "https://graph.facebook.com/v21.0/me/accounts",
            params={"access_token": user_access_token, "fields": "id,name,access_token"},
        )
        pages_resp.raise_for_status()
        pages = pages_resp.json().get("data", [])

        for page in pages:
            page_id = page["id"]
            page_token = page["access_token"]
            page_name = page.get("name") or "Facebook Page"
            out.append(
                {
                    "platform": "facebook",
                    "account_id": page_id,
                    "account_name": page_name,
                    "access_token": page_token,
                }
            )

            ig_resp = await client.get(
                f"https://graph.facebook.com/v21.0/{page_id}",
                params={
                    "fields": "instagram_business_account{id,username}",
                    "access_token": page_token,
                },
            )
            if ig_resp.status_code != 200:
                continue
            ig = ig_resp.json().get("instagram_business_account")
            if not ig:
                continue
            username = ig.get("username") or "Instagram"
            out.append(
                {
                    "platform": "instagram",
                    "account_id": ig["id"],
                    "account_name": f"@{username}" if not username.startswith("@") else username,
                    "access_token": page_token,
                }
            )

    return out
