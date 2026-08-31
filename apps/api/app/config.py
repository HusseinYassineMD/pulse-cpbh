"""Application configuration via environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Pulse"
    app_env: str = "development"
    secret_key: str = "dev-secret-change-in-production"
    api_url: str = "http://localhost:8000"
    web_url: str = "http://localhost:3000"

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
    meta_redirect_uri: str = "http://localhost:8000/auth/callback/meta"

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/auth/callback/linkedin"

    post_creator_path: Path = Path("../Post_Creator")
    token_encryption_key: str = ""

    publish_dry_run: bool = True
    auth_enabled: bool = False

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def resolved_post_creator_path(self) -> Path:
        """Resolve Post_Creator relative to Automate_Posting repo root."""
        repo_root = Path(__file__).resolve().parents[3]
        return (repo_root / self.post_creator_path).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
