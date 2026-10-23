"""Email lead when a student draft arrives; remind every N hours until approved."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Post, PostStatus
from app.services.email import send_notification_email
from app.services.student_draft import is_student_draft, student_name, ticket_id

logger = logging.getLogger(__name__)

_PENDING = (PostStatus.STAGED, PostStatus.IN_REVIEW, PostStatus.READY)


def _lead_email() -> str | None:
    settings = get_settings()
    if settings.review_lead_email.strip():
        return settings.review_lead_email.strip()
    members = settings.plan_team_members()
    if members:
        return members[0]["email"]
    return None


def _review_url() -> str:
    settings = get_settings()
    return f"{settings.web_url.rstrip('/')}/review"


def _format_sources(cfg: dict) -> str:
    lines: list[str] = []
    for entry in cfg.get("source_materials") or []:
        if not isinstance(entry, dict):
            continue
        kind = entry.get("kind") or "source"
        label = entry.get("label") or kind.replace("_", " ")
        url = entry.get("url")
        filename = entry.get("filename")
        if url:
            lines.append(f"  • {label} ({kind}): {url}")
        elif filename:
            lines.append(f"  • {label} ({kind}): file {filename}")
        else:
            lines.append(f"  • {label} ({kind})")
    return "\n".join(lines) if lines else "  (none listed)"


def _email_body(post: Post, *, reminder: bool) -> str:
    cfg = post.source_config or {}
    deliverable = cfg.get("deliverable") or "post"
    intro = "Reminder: a student draft still needs your review." if reminder else "A new student draft is ready for review."
    tid = ticket_id(post) or str(post.id)[:8].upper()
    return f"""Hi,

{intro}

Ticket: {tid}
Student: {student_name(post) or "—"}
Title: {post.title}
Type: {deliverable}
Canva: {cfg.get("canva_link") or "—"}
Slide #s (dept Canva): {cfg.get("canva_slide_numbers") or "—"}
Link in bio: {cfg.get("link_in_bio") or "—"}

Source material:
{_format_sources(cfg)}

Open review queue: {_review_url()}

Approve and schedule a date in Pulse to stop reminder emails.

— Pulse · Center for Personalized Brain Health
"""


async def notify_new_student_draft(post: Post) -> None:
    to = _lead_email()
    if not to:
        logger.warning("No REVIEW_LEAD_EMAIL or PLAN_TEAM — skipping student draft notification")
        return
    tid = ticket_id(post) or "draft"
    subject = f"[Pulse] {tid} — {student_name(post) or 'Student'} submitted: {post.title}"
    ok, msg = await send_notification_email(to, subject, _email_body(post, reminder=False))
    if not ok:
        logger.warning("Student draft notification failed: %s", msg)


async def process_review_reminders(db: AsyncSession) -> int:
    settings = get_settings()
    to = _lead_email()
    if not to:
        return 0

    hours = max(1, settings.review_reminder_hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    result = await db.execute(
        select(Post)
        .where(Post.status.in_(_PENDING))
        .options(selectinload(Post.variants))
    )
    sent = 0
    for post in result.scalars().all():
        if not is_student_draft(post):
            continue
        cfg = dict(post.source_config or {})
        last_raw = cfg.get("last_review_reminder_at")
        if last_raw:
            try:
                last = datetime.fromisoformat(str(last_raw).replace("Z", "+00:00"))
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                if last > cutoff:
                    continue
            except ValueError:
                pass
        elif cfg.get("review_notified_at"):
            try:
                last = datetime.fromisoformat(str(cfg["review_notified_at"]).replace("Z", "+00:00"))
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                if last > cutoff:
                    continue
            except ValueError:
                pass

        tid = ticket_id(post) or "draft"
        subject = f"[Pulse] Reminder {tid} — please review: {post.title}"
        ok, _ = await send_notification_email(to, subject, _email_body(post, reminder=True))
        if ok:
            cfg["last_review_reminder_at"] = datetime.now(timezone.utc).isoformat()
            post.source_config = cfg
            sent += 1

    return sent
