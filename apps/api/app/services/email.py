"""Send plan assignment emails via SMTP."""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings
from app.models import ContentIdea

logger = logging.getLogger(__name__)


def _assignment_body(idea: ContentIdea, web_url: str) -> str:
    target = idea.target_date.isoformat() if idea.target_date else "TBD"
    notes = idea.notes or "(none)"
    return f"""Hi,

You have been assigned a content item in Pulse (USC CPBH).

Title: {idea.title}
Theme: {idea.theme or "—"}
Format: {idea.format.value}
Target date: {target}
Status: {idea.status.value.replace("_", " ")}
Notes: {notes}

Open the plan board: {web_url}/plan

— Pulse · Center for Personalized Brain Health
"""


async def send_plan_assignment(idea: ContentIdea, assignee_email: str) -> tuple[bool, str]:
    settings = get_settings()
    subject = f"[Pulse] Assigned: {idea.title}"

    if not settings.smtp_host:
        logger.info(
            "Plan assignment email (SMTP not configured)\n  To: %s\n  Subject: %s\n%s",
            assignee_email,
            subject,
            _assignment_body(idea, settings.web_url),
        )
        return True, "Logged to server console (configure SMTP to send real email)"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = assignee_email
    message.set_content(_assignment_body(idea, settings.web_url))

    def _send() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)

    try:
        await asyncio.to_thread(_send)
        return True, f"Email sent to {assignee_email}"
    except Exception as exc:
        logger.exception("Failed to send plan assignment email")
        return False, str(exc)
