"""AI optimization and review routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Platform, Post, PostVariant, User
from app.schemas import (
    AIChatRequest,
    AIChatResponse,
    AIChatCaptionUpdate,
    AIOptimizeRequest,
    AIOptimizeResponse,
    AIReviewResponse,
)
from app.services.ai import AIService

router = APIRouter(prefix="/posts/{post_id}/ai", tags=["ai"])


@router.post("/optimize-captions", response_model=list[AIOptimizeResponse])
async def optimize_captions(
    post_id: UUID,
    body: AIOptimizeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post_check = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    if not post_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(select(PostVariant).where(PostVariant.post_id == post_id))
    variants = result.scalars().all()
    if not variants:
        raise HTTPException(status_code=404, detail="No variants found for this post")

    ai = AIService()
    targets = body.platforms or [v.platform for v in variants]
    responses = []

    for variant in variants:
        if variant.platform in targets:
            optimized = await ai.optimize_caption(variant.caption, variant.platform)
            variant.ai_suggested_caption = optimized.optimized_caption
            variant.hashtags = optimized.hashtags
            responses.append(optimized)

    await db.flush()
    return responses


@router.post("/chat", response_model=AIChatResponse)
async def chat_refine(
    post_id: UUID,
    body: AIChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    variants_result = await db.execute(select(PostVariant).where(PostVariant.post_id == post_id))
    variants = variants_result.scalars().all()
    if not variants:
        raise HTTPException(status_code=404, detail="No captions yet — generate content first")

    source_text = ""
    if post.source_config and isinstance(post.source_config, dict):
        source_text = str(post.source_config.get("source_text") or "")

    ai = AIService()
    pairs = [(v.platform, v.caption) for v in variants]
    history = [{"role": t.role, "content": t.content} for t in body.history]
    reply, updates = await ai.chat_refine_captions(
        body.message,
        pairs,
        post_title=post.title,
        target_platform=body.platform,
        history=history,
        source_text=source_text,
    )

    applied: list[AIChatCaptionUpdate] = []
    for variant in variants:
        if variant.platform in updates:
            variant.caption = updates[variant.platform]
            applied.append(AIChatCaptionUpdate(platform=variant.platform, caption=variant.caption))

    await db.flush()
    return AIChatResponse(reply=reply, captions=applied)


@router.post("/review-compliance", response_model=AIReviewResponse)
async def review_compliance(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post_check = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    if not post_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(select(PostVariant).where(PostVariant.post_id == post_id))
    variants = result.scalars().all()
    if not variants:
        raise HTTPException(status_code=404, detail="No variants found")

    ai = AIService()
    combined = "\n\n".join(v.caption for v in variants)
    return await ai.review_compliance(combined)
