"""Serve locally stored post images."""

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import MediaAsset, Post, User
from app.services.storage import media_root

router = APIRouter(prefix="/media", tags=["media"])


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

    asset_check = await db.execute(
        select(MediaAsset).where(MediaAsset.post_id == post_id, MediaAsset.s3_key == filename)
    )
    if not asset_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Media not found")

    path = media_root() / "posts" / str(post_id) / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path, media_type="image/png")
