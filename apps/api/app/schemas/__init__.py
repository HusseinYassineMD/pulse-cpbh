"""Pydantic request/response schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import ApprovalStatus, Platform, PostStatus, PublishStatus, ScheduleStatus, UserRole


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Posts ───────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    post_creator_id: str | None = None
    source_config: dict | None = None


class PostUpdate(BaseModel):
    title: str | None = None
    status: PostStatus | None = None


class PostVariantUpdate(BaseModel):
    caption: str | None = None
    hashtags: list[str] | None = None


class PostVariantResponse(BaseModel):
    id: UUID
    platform: Platform
    caption: str
    ai_suggested_caption: str | None
    hashtags: list[str] | None
    approval_status: ApprovalStatus

    model_config = {"from_attributes": True}


class MediaAssetResponse(BaseModel):
    id: UUID
    s3_key: str
    mime_type: str
    sort_order: int
    alt_text: str | None
    url: str | None = None

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: UUID
    title: str
    status: PostStatus
    post_creator_id: str | None
    source_config: dict | None = None
    created_at: datetime
    updated_at: datetime
    variants: list[PostVariantResponse] = []
    media_assets: list[MediaAssetResponse] = []

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    items: list[PostResponse]
    total: int


# ─── Stories ─────────────────────────────────────────────────────────────────

class StoryCreate(BaseModel):
    title: str
    source_url: str | None = None


class StoryUpdate(BaseModel):
    title: str | None = None
    source_url: str | None = None
    category: str | None = None
    source_publish_date: date | None = None


class StoryResponse(BaseModel):
    id: UUID
    title: str
    source_url: str | None
    category: str | None = None
    source_publish_date: date | None = None
    image_url: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StoryListResponse(BaseModel):
    items: list[StoryResponse]
    total: int


# ─── Scheduling ──────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    scheduled_at: datetime
    timezone: str = "America/Los_Angeles"
    platform_targets: list[Platform]


class ScheduleResponse(BaseModel):
    id: UUID
    post_id: UUID
    scheduled_at: datetime
    timezone: str
    status: ScheduleStatus
    platform_targets: list[str]

    model_config = {"from_attributes": True}


# ─── Publishing ──────────────────────────────────────────────────────────────

class PublishAttemptResponse(BaseModel):
    id: UUID
    platform: Platform
    status: PublishStatus
    platform_post_id: str | None
    error_message: str | None
    attempted_at: datetime

    model_config = {"from_attributes": True}


# ─── AI ──────────────────────────────────────────────────────────────────────

class AIOptimizeRequest(BaseModel):
    platforms: list[Platform] | None = None


class AIOptimizeResponse(BaseModel):
    platform: Platform
    original_caption: str
    optimized_caption: str
    hashtags: list[str]


class AIReviewResponse(BaseModel):
    passed: bool
    issues: list[str]
    suggestions: list[str]


# ─── Analytics ───────────────────────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    total_posts: int
    total_impressions: int
    total_engagement: int
    avg_engagement_rate: float


class PostAnalytics(BaseModel):
    post_id: UUID
    platform: Platform
    impressions: int
    likes: int
    comments: int
    shares: int
    clicks: int
    fetched_at: datetime


# ─── Templates ───────────────────────────────────────────────────────────────

class TemplateResponse(BaseModel):
    post_creator_id: str
    title: str
    slide_count: int
    platforms: list[str]
