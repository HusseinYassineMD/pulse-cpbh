"""Shared post loading helpers."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Post


async def load_post_for_response(db: AsyncSession, post_id: UUID) -> Post:
    """Load a post with relationships eagerly fetched for API serialization."""
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.variants), selectinload(Post.media_assets))
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()
