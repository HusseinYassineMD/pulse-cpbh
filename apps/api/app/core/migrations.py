"""Lightweight SQLite column migrations for local dev."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(_migrate_plan)
        await conn.run_sync(_migrate_stories)


def _migrate_stories(conn) -> None:
    rows = conn.execute(text("PRAGMA table_info(stories)")).fetchall()
    if not rows:
        return
    columns = {row[1] for row in rows}

    if "category" not in columns:
        conn.execute(text("ALTER TABLE stories ADD COLUMN category VARCHAR(100)"))

    if "source_publish_date" not in columns:
        conn.execute(text("ALTER TABLE stories ADD COLUMN source_publish_date DATE"))


def _migrate_plan(conn) -> None:
    rows = conn.execute(text("PRAGMA table_info(content_ideas)")).fetchall()
    if not rows:
        return
    columns = {row[1] for row in rows}

    if "assignee_email" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN assignee_email VARCHAR(255)"))

    if "deliverable" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN deliverable VARCHAR(50)"))
        conn.execute(
            text(
                "UPDATE content_ideas SET deliverable = CASE format "
                "WHEN 'carousel' THEN 'post' WHEN 'story' THEN 'story' WHEN 'text' THEN 'caption' "
                "ELSE 'post' END WHERE deliverable IS NULL"
            )
        )

    if "platforms" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN platforms TEXT"))

    if "source_files" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN source_files TEXT"))

    if "substack_url" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN substack_url VARCHAR(2048)"))

    if "substack_publish_date" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN substack_publish_date DATE"))

    if "post_id" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN post_id UUID REFERENCES posts(id)"))
