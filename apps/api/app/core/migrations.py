"""Lightweight SQLite column migrations for local dev."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(_migrate_plan)


def _migrate_plan(conn) -> None:
    rows = conn.execute(text("PRAGMA table_info(content_ideas)")).fetchall()
    if not rows:
        return
    columns = {row[1] for row in rows}
    if "assignee_email" not in columns:
        conn.execute(text("ALTER TABLE content_ideas ADD COLUMN assignee_email VARCHAR(255)"))
