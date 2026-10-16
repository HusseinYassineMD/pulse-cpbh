"""Create student-submitted post drafts for lead review."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MediaAsset, Platform, Post, PostStatus, PostVariant
from app.services.storage import save_images


def _caption_for(body_caption: str, unified: str | None, fallback: str) -> str:
    if body_caption.strip():
        return body_caption.strip()
    if unified and unified.strip():
        return unified.strip()
    return fallback


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

    base = unified_caption.strip() if unified_caption else title
    platforms = [
        (Platform.INSTAGRAM, caption_instagram),
        (Platform.FACEBOOK, caption_facebook),
        (Platform.LINKEDIN, caption_linkedin),
    ]
    for platform, cap in platforms:
        text = _caption_for(cap, unified_caption, base)
        db.add(PostVariant(post_id=post.id, platform=platform, caption=text))

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
