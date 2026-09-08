"""Remove all seeded/sample content from the local database."""

from __future__ import annotations

import asyncio
import shutil
import sys
from pathlib import Path

from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.deps import _get_or_create_dev_user
from app.core.database import async_session
from app.models import (
    ContentIdea,
    MediaAsset,
    Post,
    PostVariant,
    PublishAttempt,
    ScheduleEntry,
)
from app.services.storage import media_root


async def clear() -> None:
    async with async_session() as db:
        user = await _get_or_create_dev_user(db)
        posts = (await db.execute(select(Post).where(Post.user_id == user.id))).scalars().all()
        post_ids = [p.id for p in posts]

        if post_ids:
            await db.execute(
                delete(PublishAttempt).where(
                    PublishAttempt.schedule_entry_id.in_(
                        select(ScheduleEntry.id).where(ScheduleEntry.post_id.in_(post_ids))
                    )
                )
            )
            await db.execute(delete(ScheduleEntry).where(ScheduleEntry.post_id.in_(post_ids)))
            await db.execute(delete(MediaAsset).where(MediaAsset.post_id.in_(post_ids)))
            await db.execute(delete(PostVariant).where(PostVariant.post_id.in_(post_ids)))
            await db.execute(delete(Post).where(Post.id.in_(post_ids)))

        ideas = (
            await db.execute(delete(ContentIdea).where(ContentIdea.user_id == user.id))
        ).rowcount or 0

        posts_dir = media_root() / "posts"
        if posts_dir.exists():
            shutil.rmtree(posts_dir)
            posts_dir.mkdir(parents=True, exist_ok=True)

        await db.commit()
        print(f"✓ Cleared {len(post_ids)} posts and sample media")
        print(f"✓ Cleared content plan ideas")


def main() -> None:
    asyncio.run(clear())


if __name__ == "__main__":
    main()
