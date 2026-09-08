"""Publish scheduled posts to social platforms."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import (
    Platform,
    Post,
    PostStatus,
    PublishAttempt,
    PublishStatus,
    ScheduleEntry,
    ScheduleStatus,
    SocialAccount,
)
from app.services.publisher import publish_to_platform

logger = logging.getLogger(__name__)


def _media_url(post_id: UUID, filename: str) -> str:
    settings = get_settings()
    base = f"{settings.api_url}/api/v1/media/public/{post_id}/{filename}"
    if settings.media_publish_key:
        return f"{base}?key={settings.media_publish_key}"
    return base


async def publish_schedule_entry(db: AsyncSession, schedule_entry_id: UUID) -> None:
    settings = get_settings()

    result = await db.execute(
        select(ScheduleEntry)
        .where(ScheduleEntry.id == schedule_entry_id)
        .options(
            selectinload(ScheduleEntry.post).selectinload(Post.variants),
            selectinload(ScheduleEntry.post).selectinload(Post.media_assets),
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        return

    post = entry.post
    platforms = [Platform(p) for p in entry.platform_targets]
    all_success = True
    any_success = False

    for platform in platforms:
        variant = next((v for v in post.variants if v.platform == platform), None)
        if not variant:
            continue

        account_result = await db.execute(
            select(SocialAccount).where(
                SocialAccount.platform == platform,
                SocialAccount.user_id == post.user_id,
            )
        )
        account = account_result.scalar_one_or_none()

        attempt = PublishAttempt(
            schedule_entry_id=entry.id,
            platform=platform,
            status=PublishStatus.PENDING,
        )
        db.add(attempt)
        await db.flush()

        if settings.publish_dry_run:
            attempt.status = PublishStatus.SUCCESS
            attempt.platform_post_id = f"dry-run-{attempt.id}"
            attempt.error_message = "Dry-run mode — connect accounts & set PUBLISH_DRY_RUN=false to go live"
            any_success = True
            continue

        if not account:
            attempt.status = PublishStatus.FAILED
            attempt.error_message = f"No {platform.value} account — add one in Settings"
            all_success = False
            continue

        media_urls = [_media_url(post.id, a.s3_key) for a in post.media_assets]
        pub_result = await publish_to_platform(
            platform=platform,
            access_token=account.access_token_enc,
            caption=variant.caption,
            media_urls=media_urls,
            account_id=account.account_id,
        )

        if pub_result.success:
            attempt.status = PublishStatus.SUCCESS
            attempt.platform_post_id = pub_result.platform_post_id
            any_success = True
        else:
            attempt.status = PublishStatus.FAILED
            attempt.error_message = pub_result.error
            all_success = False

    if all_success and any_success:
        entry.status = ScheduleStatus.COMPLETED
        post.status = PostStatus.PUBLISHED
    elif any_success:
        entry.status = ScheduleStatus.COMPLETED
        post.status = PostStatus.PARTIALLY_PUBLISHED
    else:
        entry.status = ScheduleStatus.FAILED
        post.status = PostStatus.FAILED

    await db.flush()


async def check_and_publish_due(db: AsyncSession) -> int:
    """Find due schedules and publish them. Returns count processed."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(ScheduleEntry)
        .where(
            ScheduleEntry.status == ScheduleStatus.PENDING,
            ScheduleEntry.scheduled_at <= now,
        )
        .options(selectinload(ScheduleEntry.post))
    )
    entries = result.scalars().all()

    for entry in entries:
        entry.status = ScheduleStatus.RUNNING
        entry.post.status = PostStatus.PUBLISHING
        await db.flush()
        logger.info("Publishing schedule %s for post %s", entry.id, entry.post_id)

    await db.flush()

    for entry in entries:
        try:
            await publish_schedule_entry(db, entry.id)
        except Exception as exc:
            logger.exception("Publish failed for %s: %s", entry.id, exc)
            entry.status = ScheduleStatus.FAILED
            entry.post.status = PostStatus.FAILED

    return len(entries)
