"""Celery application and async task definitions."""

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pulse",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Los_Angeles",
    enable_utc=True,
    beat_schedule={
        "check-scheduled-posts": {
            "task": "app.workers.tasks.check_scheduled_posts",
            "schedule": crontab(minute="*/1"),
        },
        "fetch-analytics": {
            "task": "app.workers.tasks.fetch_analytics",
            "schedule": crontab(hour="6", minute="0"),
        },
        "refresh-oauth-tokens": {
            "task": "app.workers.tasks.refresh_oauth_tokens",
            "schedule": crontab(hour="*/6"),
        },
    },
)

celery_app.autodiscover_tasks(["app.workers"])
