"""Post CRUD and lifecycle routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.services.serialize import post_to_response

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
    await db.refresh(post, ["variants", "media_assets"])
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
    await db.refresh(post, ["variants", "media_assets"])
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
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    service = ContentService(db)
    try:
        post = await service.generate(post_id)
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.refresh(post, ["variants", "media_assets"])
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
    if post.status != PostStatus.READY:
        raise HTTPException(status_code=400, detail=f"Cannot review post in '{post.status}' status")
    post.status = PostStatus.IN_REVIEW
    await db.flush()
    await db.refresh(post, ["variants", "media_assets"])
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
    post.status = PostStatus.APPROVED
    await db.flush()
    await db.refresh(post, ["variants", "media_assets"])
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
