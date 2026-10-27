"""Background scheduler — checks for due posts every minute (no Redis/Celery needed)."""

from __future__ import annotations

import asyncio
import logging

from app.core.database import async_session
from app.services.publish import check_and_publish_due

logger = logging.getLogger(__name__)

_scheduler_task: asyncio.Task | None = None


async def _scheduler_loop() -> None:
    while True:
        try:
            async with async_session() as db:
                count = await check_and_publish_due(db)
                await db.commit()
                if count:
                    logger.info("Processed %d scheduled post(s)", count)
        except Exception:
            logger.exception("Scheduler tick failed")
        await asyncio.sleep(60)


def start_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("Scheduler started (checks every 60s)")


def stop_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
