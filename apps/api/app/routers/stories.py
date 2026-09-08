"""Story library — one image + Substack source link per story."""

import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Story, User
from app.schemas import StoryListResponse, StoryResponse, StoryUpdate
from app.services.storage import clear_story_media, save_story_image, story_media_dir
from app.services.story_serialize import story_to_response

router = APIRouter(prefix="/stories", tags=["stories"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _ext(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if ext in ALLOWED_EXTENSIONS else ".png"


@router.get("", response_model=StoryListResponse)
async def list_stories(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count()).select_from(Story).where(Story.user_id == user.id))).scalar() or 0
    result = await db.execute(
        select(Story)
        .where(Story.user_id == user.id)
        .order_by(Story.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    stories = result.scalars().all()
    return StoryListResponse(items=[story_to_response(s) for s in stories], total=total)


@router.post("", response_model=StoryResponse, status_code=201)
async def create_story(
    title: str = Form(...),
    source_url: str | None = Form(None),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")

    ext = _ext(image.filename or "image.png")
    story = Story(
        user_id=user.id,
        title=title.strip() or "Untitled story",
        source_url=source_url.strip() if source_url else None,
        image_key=f"image{ext}",
    )
    db.add(story)
    await db.flush()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(await image.read())
        tmp_path = Path(tmp.name)

    try:
        story.image_key = save_story_image(story.id, tmp_path, ext)
    finally:
        tmp_path.unlink(missing_ok=True)

    await db.flush()
    return story_to_response(story)


@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await _get_story(db, story_id, user.id)
    return story_to_response(story)


@router.patch("/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: UUID,
    body: StoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await _get_story(db, story_id, user.id)

    if body.title is not None:
        story.title = body.title.strip() or story.title
    if body.source_url is not None:
        story.source_url = body.source_url.strip() or None

    await db.flush()
    await db.refresh(story)
    return story_to_response(story)


@router.post("/{story_id}/image", response_model=StoryResponse)
async def replace_story_image(
    story_id: UUID,
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")

    story = await _get_story(db, story_id, user.id)
    ext = _ext(image.filename or "image.png")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(await image.read())
        tmp_path = Path(tmp.name)

    try:
        clear_story_media(story.id)
        story.image_key = save_story_image(story.id, tmp_path, ext)
    finally:
        tmp_path.unlink(missing_ok=True)

    await db.flush()
    await db.refresh(story)
    return story_to_response(story)


@router.delete("/{story_id}", status_code=204)
async def delete_story(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await _get_story(db, story_id, user.id)
    clear_story_media(story.id)
    await db.delete(story)


async def _get_story(db: AsyncSession, story_id: UUID, user_id: UUID) -> Story:
    result = await db.execute(select(Story).where(Story.id == story_id, Story.user_id == user_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story
