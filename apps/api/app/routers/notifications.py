"""Notification config (no secrets exposed)."""

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/email-status")
async def email_status():
    """Whether student-draft emails can send (Render API env)."""
    s = get_settings()
    lead = s.review_lead_email.strip()
    resend = bool(s.resend_api_key.strip())
    smtp = bool(s.smtp_host.strip() and s.smtp_user.strip() and s.smtp_password.strip())
    ready = bool(lead and resend)
    return {
        "review_lead_email_set": bool(lead),
        "resend_configured": resend,
        "smtp_configured": smtp,
        "ready": ready,
        "hint": (
            "Set REVIEW_LEAD_EMAIL and RESEND_API_KEY on pulse-cpbh-api (Render), then redeploy."
            if not ready
            else "Email is configured — new student submits should notify the lead."
        ),
    }
