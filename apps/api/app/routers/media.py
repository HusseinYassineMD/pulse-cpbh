"""Serve locally stored post images."""

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import MediaAsset, Post, Story, User
from app.services.storage import media_root

router = APIRouter(prefix="/media", tags=["media"])


def _resolve_media_path(post_id: UUID, filename: str) -> Path:
    path = media_root() / "posts" / str(post_id) / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return path


def _resolve_story_media_path(story_id: UUID, filename: str) -> Path:
    path = media_root() / "stories" / str(story_id) / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return path


async def _verify_media_asset(db: AsyncSession, post_id: UUID, filename: str) -> None:
    asset_check = await db.execute(
        select(MediaAsset).where(MediaAsset.post_id == post_id, MediaAsset.s3_key == filename)
    )
    if not asset_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Media not found")


@router.get("/public/{post_id}/{filename}")
async def get_media_public(
    post_id: UUID,
    filename: str,
    key: str = Query(..., description="Media publish key for platform fetchers"),
    db: AsyncSession = Depends(get_db),
):
    """Public media URL for Instagram/Facebook to fetch images during publish."""
    settings = get_settings()
    if not settings.media_publish_key or key != settings.media_publish_key:
        raise HTTPException(status_code=403, detail="Invalid media key")

    post_check = await db.execute(select(Post).where(Post.id == post_id))
    if not post_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await _verify_media_asset(db, post_id, filename)
    return FileResponse(_resolve_media_path(post_id, filename), media_type="image/png")


@router.get("/stories/{story_id}/{filename}")
async def get_story_media(
    story_id: UUID,
    filename: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Story).where(Story.id == story_id, Story.user_id == user.id))
    story = result.scalar_one_or_none()
    if not story or story.image_key != filename:
        raise HTTPException(status_code=404, detail="Story not found")

    path = _resolve_story_media_path(story_id, filename)
    media_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
    if filename.lower().endswith(".webp"):
        media_type = "image/webp"
    return FileResponse(path, media_type=media_type)


@router.get("/{post_id}/{filename}")
async def get_media(
    post_id: UUID,
    filename: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post_check = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    if not post_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await _verify_media_asset(db, post_id, filename)
    return FileResponse(_resolve_media_path(post_id, filename), media_type="image/png")
