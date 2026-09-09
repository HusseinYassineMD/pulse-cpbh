"""Scheduling, calendar, and publish-now routes."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import (
    ContentIdea,
    IdeaStatus,
    Platform,
    Post,
    PostStatus,
    PublishAttempt,
    ScheduleEntry,
    ScheduleStatus,
    User,
)
from app.schemas import PublishAttemptResponse, ScheduleCreate, ScheduleResponse
from app.services.publish import publish_schedule_entry

router = APIRouter(tags=["schedule"])

SCHEDULABLE = {PostStatus.READY, PostStatus.APPROVED, PostStatus.SCHEDULED}
STORY_PLATFORMS = {Platform.INSTAGRAM, Platform.FACEBOOK}


def _is_story(post: Post) -> bool:
    return bool(post.source_config and post.source_config.get("type") == "story")


def _validate_platform_targets(post: Post, platforms: list[Platform]) -> None:
    for platform in platforms:
        if not any(v.platform == platform for v in post.variants):
            raise HTTPException(status_code=400, detail=f"No caption for {platform.value}")
    if _is_story(post):
        invalid = [p for p in platforms if p not in STORY_PLATFORMS]
        if invalid:
            names = ", ".join(p.value for p in invalid)
            raise HTTPException(status_code=400, detail=f"Stories can only be scheduled to Instagram and Facebook (not {names})")


class PublishNowRequest(BaseModel):
    platforms: list[Platform] = [
        Platform.INSTAGRAM,
        Platform.FACEBOOK,
        Platform.LINKEDIN,
    ]


class ScheduleItemResponse(BaseModel):
    id: UUID
    post_id: UUID
    post_title: str
    content_type: str = "post"
    content_idea_id: UUID | None = None
    scheduled_at: datetime
    timezone: str
    status: ScheduleStatus
    platform_targets: list[str]


@router.post("/posts/{post_id}/schedule", response_model=ScheduleResponse, status_code=201)
async def schedule_post(
    post_id: UUID,
    body: ScheduleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id, Post.user_id == user.id)
        .options(selectinload(Post.variants))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in SCHEDULABLE:
        raise HTTPException(status_code=400, detail=f"Cannot schedule post in '{post.status.value}' status")
    if not post.variants:
        raise HTTPException(status_code=400, detail="Generate content before scheduling")

    _validate_platform_targets(post, body.platform_targets)

    entry = ScheduleEntry(
        post_id=post_id,
        scheduled_at=body.scheduled_at,
        timezone=body.timezone,
        platform_targets=[p.value for p in body.platform_targets],
    )
    db.add(entry)
    post.status = PostStatus.SCHEDULED
    await db.flush()
    return entry


@router.post("/posts/{post_id}/publish-now", response_model=list[PublishAttemptResponse])
async def publish_now(
    post_id: UUID,
    body: PublishNowRequest | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    platforms = (body.platforms if body else PublishNowRequest().platforms)
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id, Post.user_id == user.id)
        .options(selectinload(Post.variants))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not post.variants:
        raise HTTPException(status_code=400, detail="Generate content first")

    _validate_platform_targets(post, platforms)

    entry = ScheduleEntry(
        post_id=post_id,
        scheduled_at=datetime.now(timezone.utc),
        platform_targets=[p.value for p in platforms],
        status=ScheduleStatus.RUNNING,
    )
    db.add(entry)
    post.status = PostStatus.PUBLISHING
    await db.flush()

    await publish_schedule_entry(db, entry.id)
    attempts = (
        await db.execute(
            select(PublishAttempt).where(PublishAttempt.schedule_entry_id == entry.id)
        )
    ).scalars().all()
    return attempts


@router.get("/schedule", response_model=list[ScheduleItemResponse])
async def get_calendar(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduleEntry, Post.title, Post.source_config)
        .join(Post)
        .where(Post.user_id == user.id, ScheduleEntry.status != ScheduleStatus.CANCELLED)
        .order_by(ScheduleEntry.scheduled_at)
    )
    rows = result.all()

    return [
        ScheduleItemResponse(
            id=entry.id,
            post_id=entry.post_id,
            post_title=title,
            content_type=(source_config or {}).get("type", "post"),
            content_idea_id=(
                UUID(source_config["content_idea_id"])
                if source_config and source_config.get("content_idea_id")
                else None
            ),
            scheduled_at=entry.scheduled_at,
            timezone=entry.timezone,
            status=entry.status,
            platform_targets=entry.platform_targets,
        )
        for entry, title, source_config in rows
    ]


async def _revert_linked_plan_idea(db: AsyncSession, post: Post) -> ContentIdea | None:
    idea_id_str = (post.source_config or {}).get("content_idea_id")
    if not idea_id_str:
        return None
    try:
        idea_id = UUID(str(idea_id_str))
    except ValueError:
        return None
    result = await db.execute(select(ContentIdea).where(ContentIdea.id == idea_id))
    idea = result.scalar_one_or_none()
    if not idea:
        return None
    if idea.status == IdeaStatus.SCHEDULED:
        idea.status = IdeaStatus.APPROVED
    idea.post_id = None
    return idea


@router.delete("/schedule/{schedule_id}", status_code=204)
async def cancel_schedule(
    schedule_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduleEntry)
        .join(Post)
        .where(ScheduleEntry.id == schedule_id, Post.user_id == user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule entry not found")
    if entry.status == ScheduleStatus.CANCELLED:
        return

    revert_plan = entry.status == ScheduleStatus.PENDING
    entry.status = ScheduleStatus.CANCELLED

    post_result = await db.execute(
        select(Post)
        .where(Post.id == entry.post_id)
        .options(selectinload(Post.media_assets))
    )
    post = post_result.scalar_one_or_none()
    if not post:
        return

    if revert_plan:
        idea = await _revert_linked_plan_idea(db, post)
        plan_stub = idea is not None and not post.media_assets and not post.post_creator_id
        if plan_stub and post.status in (PostStatus.SCHEDULED, PostStatus.READY, PostStatus.APPROVED):
            await db.delete(post)
        elif post.status == PostStatus.SCHEDULED:
            post.status = PostStatus.READY


@router.get("/posts/{post_id}/publish-attempts", response_model=list[PublishAttemptResponse])
async def get_publish_attempts(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post_check = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    if not post_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(PublishAttempt)
        .join(ScheduleEntry)
        .where(ScheduleEntry.post_id == post_id)
        .order_by(PublishAttempt.attempted_at.desc())
    )
    return result.scalars().all()
