"""LinkedIn OAuth for organization posting."""

from __future__ import annotations

import httpx

from app.config import get_settings

LINKEDIN_SCOPES = ["openid", "profile", "w_organization_social", "rw_organization_admin"]


def linkedin_authorize_url(state: str) -> str:
    settings = get_settings()
    if not settings.linkedin_client_id:
        raise ValueError("LINKEDIN_CLIENT_ID is not configured")
    scope = " ".join(LINKEDIN_SCOPES)
    return (
        "https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={settings.linkedin_client_id}"
        f"&redirect_uri={settings.linkedin_redirect_uri}"
        f"&state={state}"
        f"&scope={scope}"
    )


async def exchange_linkedin_code(code: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.linkedin_redirect_uri,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise ValueError("No access token in LinkedIn response")
        return token


async def discover_linkedin_org(access_token: str) -> dict | None:
    """First org the token can post as."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.linkedin.com/v2/organizationAcls"
            "?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,id)))",
            headers=headers,
        )
        if resp.status_code != 200:
            resp = await client.get(
                "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&projection=(elements*(organization~(localizedName,id)))",
                headers=headers,
            )
        resp.raise_for_status()
        elements = resp.json().get("elements") or []
        for el in elements:
            org = el.get("organization~") or {}
            org_id = org.get("id")
            if org_id:
                name = org.get("localizedName") or "LinkedIn Page"
                numeric = str(org_id).split(":")[-1]
                return {
                    "platform": "linkedin",
                    "account_id": numeric,
                    "account_name": name,
                    "access_token": access_token,
                }
    return None
