"""Background tasks for publishing, analytics, and token refresh."""

import asyncio
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
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
from app.workers.celery_app import celery_app

settings = get_settings()


def _get_async_session():
    engine = create_async_engine(settings.database_url)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@celery_app.task(name="app.workers.tasks.check_scheduled_posts")
def check_scheduled_posts():
    """Poll for posts due to publish and enqueue publish jobs."""
    asyncio.run(_check_scheduled_posts())


async def _check_scheduled_posts():
    session_factory = _get_async_session()
    async with session_factory() as db:
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
            await db.commit()
            publish_post.delay(str(entry.id))


@celery_app.task(name="app.workers.tasks.publish_post", bind=True, max_retries=3)
def publish_post(self, schedule_entry_id: str):
    """Publish a scheduled post to all target platforms."""
    asyncio.run(_publish_post(UUID(schedule_entry_id)))


async def _publish_post(schedule_entry_id: UUID):
    session_factory = _get_async_session()
    async with session_factory() as db:
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

            if not account:
                attempt.status = PublishStatus.FAILED
                attempt.error_message = f"No connected {platform.value} account"
                all_success = False
                continue

            media_urls = [f"{settings.s3_endpoint}/{settings.s3_bucket}/{a.s3_key}" for a in post.media_assets]
            result = await publish_to_platform(
                platform=platform,
                access_token=account.access_token_enc,  # TODO: decrypt
                caption=variant.caption,
                media_urls=media_urls,
                account_id=account.account_id,
            )

            if result.success:
                attempt.status = PublishStatus.SUCCESS
                attempt.platform_post_id = result.platform_post_id
            else:
                attempt.status = PublishStatus.FAILED
                attempt.error_message = result.error
                all_success = False

        entry.status = ScheduleStatus.COMPLETED if all_success else ScheduleStatus.FAILED
        post.status = PostStatus.PUBLISHED if all_success else PostStatus.PARTIALLY_PUBLISHED
        await db.commit()


@celery_app.task(name="app.workers.tasks.fetch_analytics")
def fetch_analytics():
    """Fetch engagement metrics for published posts."""
    # Phase 4 implementation
    pass


@celery_app.task(name="app.workers.tasks.refresh_oauth_tokens")
def refresh_oauth_tokens():
    """Refresh expiring OAuth tokens for connected social accounts."""
    # Phase 3 implementation
    pass
