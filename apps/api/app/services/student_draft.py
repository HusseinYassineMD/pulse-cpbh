"""Create student-submitted post drafts for lead review."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import MediaAsset, Platform, Post, PostStatus, PostVariant
from app.services.storage import save_images


def _caption_for(body_caption: str, unified: str | None, fallback: str) -> str:
    if body_caption.strip():
        return body_caption.strip()
    if unified and unified.strip():
        return unified.strip()
    return fallback


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def is_student_draft(post: Post) -> bool:
    cfg = post.source_config or {}
    return cfg.get("type") == "student_draft"


def student_name(post: Post) -> str:
    cfg = post.source_config or {}
    return str(cfg.get("submitted_by") or "").strip()


async def create_student_draft(
    db: AsyncSession,
    user_id: UUID,
    *,
    title: str,
    submitted_by: str,
    notes: str | None,
    caption_instagram: str,
    caption_facebook: str,
    caption_linkedin: str,
    unified_caption: str | None,
    image_paths: list[Path] | None = None,
    platforms: list[Platform] | None = None,
) -> Post:
    post = Post(
        user_id=user_id,
        title=title.strip() or "Untitled draft",
        status=PostStatus.STAGED,
        source_config={
            "type": "student_draft",
            "submitted_by": submitted_by.strip(),
            "student_notes": (notes or "").strip(),
        },
    )
    db.add(post)
    await db.flush()

    _add_variants(db, post, caption_instagram, caption_facebook, caption_linkedin, unified_caption, title, platforms)

    if image_paths:
        keys = save_images(post.id, image_paths)
        for i, key in enumerate(keys):
            db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key=key,
                    mime_type="image/png",
                    sort_order=i,
                )
            )

    await db.flush()
    return post


def _add_variants(
    db: AsyncSession,
    post: Post,
    caption_instagram: str,
    caption_facebook: str,
    caption_linkedin: str,
    unified_caption: str | None,
    title: str,
    platforms: list[Platform] | None,
) -> None:
    base = unified_caption.strip() if unified_caption else title
    allowed = set(platforms or [Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN])
    all_platforms = [
        (Platform.INSTAGRAM, caption_instagram),
        (Platform.FACEBOOK, caption_facebook),
        (Platform.LINKEDIN, caption_linkedin),
    ]
    added = 0
    for platform, cap in all_platforms:
        if platform not in allowed:
            continue
        text = _caption_for(cap, unified_caption, base)
        db.add(PostVariant(post_id=post.id, platform=platform, caption=text))
        added += 1

    if added == 0:
        raise ValueError("Pick at least one platform.")


async def list_returned_for_student(db: AsyncSession, user_id: UUID, submitted_by: str) -> list[Post]:
    needle = _normalize_name(submitted_by)
    if len(needle) < 2:
        return []

    result = await db.execute(
        select(Post)
        .where(Post.user_id == user_id, Post.status == PostStatus.DRAFT)
        .options(selectinload(Post.variants), selectinload(Post.media_assets))
        .order_by(Post.updated_at.desc())
    )
    posts = result.scalars().all()
    out: list[Post] = []
    for post in posts:
        if not is_student_draft(post):
            continue
        cfg = post.source_config or {}
        if not cfg.get("returned_for_revision"):
            continue
        if _normalize_name(student_name(post)) != needle:
            continue
        out.append(post)
    return out


async def resubmit_student_draft(
    db: AsyncSession,
    post: Post,
    *,
    submitted_by: str,
    title: str,
    notes: str | None,
    caption_instagram: str,
    caption_facebook: str,
    caption_linkedin: str,
    unified_caption: str | None,
    image_paths: list[Path] | None,
    platforms: list[Platform],
) -> Post:
    if not is_student_draft(post):
        raise ValueError("Not a student draft.")
    if post.status != PostStatus.DRAFT:
        raise ValueError("This draft is not open for revision.")
    cfg = dict(post.source_config or {})
    if not cfg.get("returned_for_revision"):
        raise ValueError("This draft was not sent back for revision.")
    if _normalize_name(student_name(post)) != _normalize_name(submitted_by):
        raise ValueError("Name does not match the original submission.")

    post.title = title.strip() or "Untitled draft"
    cfg["student_notes"] = (notes or "").strip()
    cfg.pop("returned_for_revision", None)
    cfg.pop("return_notes", None)
    post.source_config = cfg
    post.status = PostStatus.STAGED

    await db.execute(delete(PostVariant).where(PostVariant.post_id == post.id))
    _add_variants(db, post, caption_instagram, caption_facebook, caption_linkedin, unified_caption, title, platforms)

    if image_paths:
        await db.execute(delete(MediaAsset).where(MediaAsset.post_id == post.id))
        keys = save_images(post.id, image_paths)
        for i, key in enumerate(keys):
            db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key=key,
                    mime_type="image/png",
                    sort_order=i,
                )
            )

    await db.flush()
    return post
