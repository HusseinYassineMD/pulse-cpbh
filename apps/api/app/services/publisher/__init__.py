"""Platform publisher abstraction — Instagram, Facebook, LinkedIn."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

import httpx

from app.models import Platform


@dataclass
class PublishResult:
    success: bool
    platform_post_id: str | None = None
    error: str | None = None


class BasePublisher(ABC):
    platform: Platform

    @abstractmethod
    async def publish(
        self,
        access_token: str,
        caption: str,
        media_urls: list[str],
        account_id: str,
    ) -> PublishResult:
        ...


class InstagramPublisher(BasePublisher):
    platform = Platform.INSTAGRAM

    async def publish(
        self,
        access_token: str,
        caption: str,
        media_urls: list[str],
        account_id: str,
    ) -> PublishResult:
        async with httpx.AsyncClient() as client:
            try:
                if len(media_urls) == 1:
                    return await self._publish_single(client, access_token, caption, media_urls[0], account_id)
                return await self._publish_carousel(client, access_token, caption, media_urls, account_id)
            except Exception as e:
                return PublishResult(success=False, error=str(e))

    async def _publish_single(
        self, client: httpx.AsyncClient, token: str, caption: str, media_url: str, account_id: str
    ) -> PublishResult:
        create_resp = await client.post(
            f"https://graph.facebook.com/v21.0/{account_id}/media",
            params={"image_url": media_url, "caption": caption, "access_token": token},
        )
        create_resp.raise_for_status()
        creation_id = create_resp.json()["id"]

        publish_resp = await client.post(
            f"https://graph.facebook.com/v21.0/{account_id}/media_publish",
            params={"creation_id": creation_id, "access_token": token},
        )
        publish_resp.raise_for_status()
        return PublishResult(success=True, platform_post_id=publish_resp.json()["id"])

    async def _publish_carousel(
        self, client: httpx.AsyncClient, token: str, caption: str, media_urls: list[str], account_id: str
    ) -> PublishResult:
        children_ids = []
        for url in media_urls:
            resp = await client.post(
                f"https://graph.facebook.com/v21.0/{account_id}/media",
                params={"image_url": url, "is_carousel_item": "true", "access_token": token},
            )
            resp.raise_for_status()
            children_ids.append(resp.json()["id"])

        carousel_resp = await client.post(
            f"https://graph.facebook.com/v21.0/{account_id}/media",
            params={
                "media_type": "CAROUSEL",
                "caption": caption,
                "children": ",".join(children_ids),
                "access_token": token,
            },
        )
        carousel_resp.raise_for_status()
        creation_id = carousel_resp.json()["id"]

        publish_resp = await client.post(
            f"https://graph.facebook.com/v21.0/{account_id}/media_publish",
            params={"creation_id": creation_id, "access_token": token},
        )
        publish_resp.raise_for_status()
        return PublishResult(success=True, platform_post_id=publish_resp.json()["id"])


class FacebookPublisher(BasePublisher):
    platform = Platform.FACEBOOK

    async def publish(
        self,
        access_token: str,
        caption: str,
        media_urls: list[str],
        account_id: str,
    ) -> PublishResult:
        async with httpx.AsyncClient() as client:
            try:
                if len(media_urls) == 1:
                    resp = await client.post(
                        f"https://graph.facebook.com/v21.0/{account_id}/photos",
                        params={"url": media_urls[0], "caption": caption, "access_token": access_token},
                    )
                else:
                    resp = await client.post(
                        f"https://graph.facebook.com/v21.0/{account_id}/feed",
                        params={
                            "message": caption,
                            "attached_media": [{"media_fbid": url} for url in media_urls],
                            "access_token": access_token,
                        },
                    )
                resp.raise_for_status()
                data = resp.json()
                return PublishResult(success=True, platform_post_id=data.get("id") or data.get("post_id"))
            except Exception as e:
                return PublishResult(success=False, error=str(e))


class LinkedInPublisher(BasePublisher):
    platform = Platform.LINKEDIN

    async def publish(
        self,
        access_token: str,
        caption: str,
        media_urls: list[str],
        account_id: str,
    ) -> PublishResult:
        async with httpx.AsyncClient() as client:
            try:
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                }

                payload = {
                    "author": f"urn:li:organization:{account_id}",
                    "commentary": caption,
                    "visibility": "PUBLIC",
                    "distribution": {"feedDistribution": "MAIN_FEED"},
                    "lifecycleState": "PUBLISHED",
                }

                resp = await client.post(
                    "https://api.linkedin.com/rest/posts",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                post_id = resp.headers.get("x-restli-id", "")
                return PublishResult(success=True, platform_post_id=post_id)
            except Exception as e:
                return PublishResult(success=False, error=str(e))


PUBLISHERS: dict[Platform, BasePublisher] = {
    Platform.INSTAGRAM: InstagramPublisher(),
    Platform.FACEBOOK: FacebookPublisher(),
    Platform.LINKEDIN: LinkedInPublisher(),
}


async def publish_to_platform(
    platform: Platform,
    access_token: str,
    caption: str,
    media_urls: list[str],
    account_id: str,
) -> PublishResult:
    publisher = PUBLISHERS.get(platform)
    if not publisher:
        return PublishResult(success=False, error=f"No publisher for {platform}")
    return await publisher.publish(access_token, caption, media_urls, account_id)
