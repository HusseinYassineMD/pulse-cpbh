"""Application configuration via environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(url: str) -> str:
    u = url.strip()
    if u.startswith("postgres://"):
        u = "postgresql://" + u[len("postgres://") :]
    if u.startswith("postgresql://") and "+asyncpg" not in u.split("://", 1)[0]:
        u = u.replace("postgresql://", "postgresql+asyncpg://", 1)
    return u


def _ensure_https_url(url: str) -> str:
    s = url.strip().rstrip("/")
    if s and not s.startswith("http://") and not s.startswith("https://"):
        return f"https://{s}"
    return s


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Pulse"
    app_env: str = "development"
    secret_key: str = "dev-secret-change-in-production"
    api_url: str = "http://localhost:8010"
    web_url: str = "http://localhost:3010"
    media_publish_key: str = "dev-media-key-change-me"

    # Default: SQLite (no Docker/Postgres required for local dev)
    database_url: str = "sqlite+aiosqlite:///./pulse.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "pulse-media"
    s3_region: str = "us-west-2"

    jwt_secret_key: str = "dev-jwt-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ai_model: str = "gpt-4o"
    ai_vision_model: str = "gpt-4o"

    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = "http://127.0.0.1:8010/api/v1/oauth/meta/callback"

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://127.0.0.1:8010/api/v1/oauth/linkedin/callback"

    # Public HTTPS base for media URLs during publish (ngrok or deployed API). Required for Instagram.
    publish_api_url: str = ""

    post_creator_path: Path = Path("../Post_Creator")
    token_encryption_key: str = ""

    publish_dry_run: bool = True
    auth_enabled: bool = False

    # Plan — team roster as "Name:email,Name:email"
    plan_team: str = ""

    # Email — Resend is tried first (easiest auto-send); SMTP is optional fallback
    resend_api_key: str = ""
    resend_from: str = "Pulse CPBH <onboarding@resend.dev>"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db(cls, v: object) -> object:
        return _normalize_database_url(v) if isinstance(v, str) else v

    @field_validator("api_url", "web_url", "publish_api_url", mode="before")
    @classmethod
    def normalize_host_urls(cls, v: object) -> object:
        return _ensure_https_url(v) if isinstance(v, str) and v.strip() else v

    def plan_team_members(self) -> list[dict[str, str]]:
        members: list[dict[str, str]] = []
        for entry in self.plan_team.split(","):
            entry = entry.strip()
            if not entry or ":" not in entry:
                continue
            name, email = entry.split(":", 1)
            members.append({"name": name.strip(), "email": email.strip()})
        return members

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def effective_api_url(self) -> str:
        """Base URL for media/publish links. Local dev always uses localhost (ignores stale tunnels in .env)."""
        if self.is_development:
            import os

            port = os.environ.get("PULSE_API_PORT", "8010")
            return f"http://127.0.0.1:{port}"
        return self.api_url.rstrip("/")

    @property
    def media_public_base(self) -> str:
        """URL platforms use to fetch images — must be reachable from Meta/LinkedIn servers."""
        pub = (self.publish_api_url or "").strip().rstrip("/")
        if pub:
            return pub
        api = self.api_url.strip().rstrip("/")
        if api.startswith("https://"):
            return api
        return self.effective_api_url

    @property
    def resolved_post_creator_path(self) -> Path:
        """Resolve Post_Creator relative to Automate_Posting repo root."""
        repo_root = Path(__file__).resolve().parents[3]
        return (repo_root / self.post_creator_path).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
