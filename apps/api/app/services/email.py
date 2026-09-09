"""Send plan assignment emails via Resend, SMTP, or client compose fallback."""

from __future__ import annotations

import asyncio
import json
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import Settings
from app.models import ContentIdea

logger = logging.getLogger(__name__)

_PLATFORM_LABELS = {
    "instagram": "Instagram",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
}


def _parse_json_list(raw: str | None) -> list:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _platforms_label(raw: str | None) -> str:
    platforms = _parse_json_list(raw)
    if not platforms:
        return "—"
    return ", ".join(_PLATFORM_LABELS.get(str(p), str(p).replace("_", " ")) for p in platforms)


def _deliverable_label(idea: ContentIdea) -> str:
    if idea.deliverable:
        return idea.deliverable.value.replace("_", " ")
    return idea.format.value.replace("_", " ")


def _source_files_section(idea: ContentIdea, web_url: str) -> str:
    entries = _parse_json_list(idea.source_files)
    if not entries:
        return ""
    lines = ["Source files:"]
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("filename") or "file"
        filename = entry.get("filename")
        if filename:
            lines.append(f"  • {name} ({web_url}/api/media/plan/{idea.id}/{filename})")
        else:
            lines.append(f"  • {name}")
    return "\n".join(lines) + "\n"


def _assignment_body(idea: ContentIdea, web_url: str) -> str:
    target = idea.target_date.isoformat() if idea.target_date else "TBD"
    notes = idea.notes or "(none)"
    deliverable = _deliverable_label(idea)
    platforms = _platforms_label(idea.platforms)
    idea_url = f"{web_url.rstrip('/')}/plan?idea={idea.id}"
    substack = ""
    if idea.substack_url or idea.substack_publish_date:
        pub = idea.substack_publish_date.isoformat() if idea.substack_publish_date else "TBD"
        substack = f"\nSubstack link: {idea.substack_url or '—'}\nSubstack publish date: {pub}"
    source_files = _source_files_section(idea, web_url)
    return f"""Hi,

You have been assigned a content item in Pulse (USC CPBH).

View assignment: {idea_url}

Topic: {idea.title}
Category: {idea.theme or "—"}
Deliverable: {deliverable}
Platform: {platforms}
Target date: {target}
Assigned to: {idea.owner or "—"}
Status: {idea.status.value.replace("_", " ")}{substack}
{source_files}Notes: {notes}

— Pulse · Center for Personalized Brain Health
"""


def _friendly_smtp_error(exc: Exception) -> str:
    text = str(exc).lower()
    if "not authenticated" in text or "530" in text:
        return "USC mail blocked automatic send — opening Outlook for you to click Send"
    if "authentication" in text or "535" in text:
        return "Mail login failed — opening Outlook for you to click Send"
    return f"Could not auto-send ({exc}). Opening Outlook for you to click Send."


async def _send_via_resend(
    settings: Settings,
    assignee_email: str,
    subject: str,
    body: str,
) -> tuple[bool, str] | None:
    if not settings.resend_api_key:
        return None
    payload = {
        "from": settings.resend_from,
        "to": [assignee_email],
        "subject": subject,
        "text": body,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code in (200, 201):
            return True, f"Email sent to {assignee_email}"
        logger.warning("Resend failed: %s %s", response.status_code, response.text[:300])
        return False, f"Email provider error — opening Outlook for you to click Send"
    except Exception as exc:
        logger.exception("Resend request failed")
        return False, f"Email provider error — opening Outlook for you to click Send"


def _send_via_smtp(settings: Settings, assignee_email: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_user or settings.smtp_from
    message["To"] = assignee_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


async def send_plan_assignment(idea: ContentIdea, assignee_email: str) -> tuple[bool, str, bool]:
    """Returns (ok, message, use_compose_fallback)."""
    settings = Settings()
    subject = f"[Pulse] Assigned: {idea.title}"
    body = _assignment_body(idea, settings.web_url)

    resend_result = await _send_via_resend(settings, assignee_email, subject, body)
    if resend_result is not None:
        ok, message = resend_result
        if ok:
            return ok, message, False
        return False, message, True

    if settings.smtp_host and settings.smtp_user and settings.smtp_password:
        host = settings.smtp_host.lower()
        edu_mailbox = settings.smtp_user.lower().endswith(".edu")
        usc_smtp = edu_mailbox or "office365" in host or "outlook" in host
        if usc_smtp and not settings.resend_api_key:
            logger.info("Skipping USC SMTP (blocked by Microsoft 365) — using Outlook compose fallback")
        else:
            try:
                await asyncio.to_thread(_send_via_smtp, settings, assignee_email, subject, body)
                return True, f"Email sent to {assignee_email}", False
            except Exception as exc:
                logger.exception("Failed to send plan assignment email via SMTP")
                return False, _friendly_smtp_error(exc), True

    logger.info(
        "Plan assignment compose fallback\n  To: %s\n  Subject: %s\n%s",
        assignee_email,
        subject,
        body,
    )
    return (
        False,
        "Opening Outlook with a pre-filled email — click Send to deliver it",
        True,
    )
