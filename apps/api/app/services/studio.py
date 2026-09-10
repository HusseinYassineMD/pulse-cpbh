"""Create Studio — free-form source → captions → optional carousel."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Post, PostStatus, PostVariant
from app.services.ai import AIService
from app.services.content import ContentService
from app.services.post_queries import load_post_for_response


async def create_from_source(
    db: AsyncSession,
    *,
    user_id: UUID,
    title: str,
    source_text: str,
    template_id: str | None = None,
    plan_idea_id: str | None = None,
) -> tuple[Post, str]:
    """Create a post from pasted/plan content; optionally run Post_Creator for slides."""
    source_config: dict = {
        "type": "post",
        "studio_source": True,
        "source_text": source_text[:20000] if source_text else "",
    }
    if plan_idea_id:
        source_config["content_idea_id"] = plan_idea_id

    post = Post(
        user_id=user_id,
        title=title.strip() or "Untitled post",
        post_creator_id=template_id,
        status=PostStatus.DRAFT,
        source_config=source_config,
    )
    db.add(post)
    await db.flush()

    service = ContentService(db)
    ai = AIService()

    if template_id:
        post = await service.generate(post.id, mode="post")
        if source_text.strip():
            pairs = [(v.platform, v.caption) for v in post.variants]
            _, updates = await ai.chat_refine_captions(
                f"Rewrite these captions using this source material. Keep facts accurate and CPBH voice.\n\n{source_text[:8000]}",
                pairs,
                post_title=title,
            )
            result = await db.execute(select(PostVariant).where(PostVariant.post_id == post.id))
            for variant in result.scalars().all():
                if variant.platform in updates:
                    variant.caption = updates[variant.platform]
            await db.flush()
            post = await load_post_for_response(db, post.id)
            msg = f"Created carousel ({len(post.media_assets)} slides) with captions from your source."
        else:
            msg = f"Created carousel with {len(post.media_assets)} slides."
    elif source_text.strip():
        captions = await ai.generate_captions_from_source(title, source_text)
        for platform, caption in captions.items():
            db.add(
                PostVariant(
                    post_id=post.id,
                    platform=platform,
                    caption=caption,
                )
            )
        post.status = PostStatus.READY
        await db.flush()
        post = await load_post_for_response(db, post.id)
        msg = f"Generated {len(captions)} platform captions from your content."
    else:
        raise ValueError("Add content to paste or pick a template with slides.")

    return post, msg
