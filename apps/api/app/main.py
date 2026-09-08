"""Pulse API — Automated Social Media Posting Platform."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.database import Base, engine
import app.models  # noqa: F401 — register all models before create_all
from app.routers import accounts, ai, auth, commands, dashboard, media, plan, posts, schedule, stories, templates
from app.services.scheduler import start_scheduler, stop_scheduler

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    logger.info("Pulse ready — scheduler active, dry_run=%s", settings.publish_dry_run)
    yield
    stop_scheduler()
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    description="AI-powered social media automation for CPBH",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_url, "http://localhost:3000", "http://localhost:3001", "http://localhost:3003", "http://localhost:3010"],
    allow_origin_regex=r"http://localhost:\d+|https://.*\.onrender\.com|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
app.include_router(commands.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(accounts.router, prefix="/api/v1")
app.include_router(schedule.router, prefix="/api/v1")
app.include_router(plan.router, prefix="/api/v1")
app.include_router(stories.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}
