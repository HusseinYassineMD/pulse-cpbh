"""Post CRUD and lifecycle routes."""

import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Platform, Post, PostStatus, PostVariant, User
from app.schemas import (
    PostCreate,
    PostListResponse,
    PostResponse,
    PostUpdate,
    PostVariantResponse,
    PostVariantUpdate,
)
from app.services.content import ContentService
from app.services.post_queries import load_post_for_response
from app.services.serialize import post_to_response
from app.services.student_draft import create_student_draft

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=PostListResponse)
async def list_posts(
    status: PostStatus | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Post)
        .where(Post.user_id == user.id)
        .options(selectinload(Post.variants), selectinload(Post.media_assets))
    )
    if status:
        query = query.where(Post.status == status)

    count_query = select(func.count()).select_from(Post).where(Post.user_id == user.id)
    if status:
        count_query = count_query.where(Post.status == status)
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.order_by(Post.created_at.desc()).offset(skip).limit(limit))
    posts = result.scalars().all()

    return PostListResponse(items=[post_to_response(p) for p in posts], total=total)


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    body: PostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = Post(
        user_id=user.id,
        title=body.title,
        post_creator_id=body.post_creator_id,
        source_config=body.source_config,
    )
    db.add(post)
    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id, Post.user_id == user.id)
        .options(selectinload(Post.variants), selectinload(Post.media_assets))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_to_response(post)


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    body: PostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if body.title is not None:
        post.title = body.title
    if body.status is not None:
        post.status = body.status

    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.delete(post)


@router.post("/{post_id}/generate", response_model=PostResponse)
async def generate_content(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    mode = (post.source_config or {}).get("type", "post")
    service = ContentService(db)
    try:
        post = await service.generate(post_id, mode=mode)
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return post_to_response(post)


@router.post("/student-draft", response_model=PostResponse, status_code=201)
async def submit_student_draft(
    title: str = Form(...),
    submitted_by: str = Form(...),
    notes: str | None = Form(None),
    caption_instagram: str = Form(""),
    caption_facebook: str = Form(""),
    caption_linkedin: str = Form(""),
    unified_caption: str | None = Form(None),
    images: list[UploadFile] = File(default=[]),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tmp_paths: list[Path] = []
    try:
        for upload in images[:10]:
            if not upload.content_type or not upload.content_type.startswith("image/"):
                continue
            ext = Path(upload.filename or "slide.png").suffix.lower()
            if ext not in ALLOWED_IMAGE_EXT:
                ext = ".png"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(await upload.read())
                tmp_paths.append(Path(tmp.name))
        post = await create_student_draft(
            db,
            user.id,
            title=title,
            submitted_by=submitted_by,
            notes=notes,
            caption_instagram=caption_instagram,
            caption_facebook=caption_facebook,
            caption_linkedin=caption_linkedin,
            unified_caption=unified_caption,
            image_paths=tmp_paths or None,
        )
    finally:
        for p in tmp_paths:
            p.unlink(missing_ok=True)

    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.post("/{post_id}/submit-review", response_model=PostResponse)
async def submit_for_review(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in (PostStatus.READY, PostStatus.STAGED):
        raise HTTPException(status_code=400, detail=f"Cannot review post in '{post.status}' status")
    post.status = PostStatus.IN_REVIEW
    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.post("/{post_id}/return-to-student", response_model=PostResponse)
async def return_to_student(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in (PostStatus.STAGED, PostStatus.IN_REVIEW):
        raise HTTPException(status_code=400, detail=f"Cannot return post in '{post.status}' status")
    cfg = dict(post.source_config or {})
    cfg["returned_for_revision"] = True
    post.source_config = cfg
    post.status = PostStatus.DRAFT
    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.post("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in (PostStatus.READY, PostStatus.IN_REVIEW, PostStatus.STAGED):
        raise HTTPException(status_code=400, detail=f"Cannot approve post in '{post.status}' status")
    post.status = PostStatus.APPROVED
    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.post("/{post_id}/unapprove", response_model=PostResponse)
async def unapprove_post(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status != PostStatus.APPROVED:
        raise HTTPException(status_code=400, detail=f"Cannot unapprove post in '{post.status}' status")
    post.status = PostStatus.IN_REVIEW
    await db.flush()
    post = await load_post_for_response(db, post.id)
    return post_to_response(post)


@router.patch("/{post_id}/variants/{platform}", response_model=PostVariantResponse)
async def update_variant(
    post_id: UUID,
    platform: Platform,
    body: PostVariantUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post_result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(PostVariant).where(PostVariant.post_id == post_id, PostVariant.platform == platform)
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    if body.caption is not None:
        variant.caption = body.caption
    if body.hashtags is not None:
        variant.hashtags = body.hashtags
    await db.flush()
    return variant
