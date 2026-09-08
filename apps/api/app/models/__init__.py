"""SQLAlchemy domain models."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


class Platform(str, enum.Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"


class PostStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    READY = "ready"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    PARTIALLY_PUBLISHED = "partially_published"
    FAILED = "failed"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ScheduleStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PublishStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class IdeaStatus(str, enum.Enum):
    IDEA = "idea"
    APPROVED = "approved"
    IN_PRODUCTION = "in_production"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ON_HOLD = "on_hold"


class ContentFormat(str, enum.Enum):
    CAROUSEL = "carousel"
    STORY = "story"
    TEXT = "text"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False), default=UserRole.EDITOR)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    social_accounts: Mapped[list["SocialAccount"]] = relationship(back_populates="user")
    posts: Mapped[list["Post"]] = relationship(back_populates="user")
    stories: Mapped[list["Story"]] = relationship(back_populates="user")
    content_ideas: Mapped[list["ContentIdea"]] = relationship(back_populates="user")


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    account_id: Mapped[str] = mapped_column(String(255))
    account_name: Mapped[str] = mapped_column(String(255))
    access_token_enc: Mapped[str] = mapped_column(Text)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="social_accounts")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(500))
    status: Mapped[PostStatus] = mapped_column(Enum(PostStatus, native_enum=False), default=PostStatus.DRAFT)
    post_creator_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="posts")
    variants: Mapped[list["PostVariant"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    media_assets: Mapped[list["MediaAsset"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    schedule_entries: Mapped[list["ScheduleEntry"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )


class PostVariant(Base):
    __tablename__ = "post_variants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("posts.id"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    caption: Mapped[str] = mapped_column(Text, default="")
    ai_suggested_caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    hashtags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, native_enum=False), default=ApprovalStatus.PENDING
    )

    post: Mapped["Post"] = relationship(back_populates="variants")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("posts.id"))
    s3_key: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(100), default="image/png")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    alt_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    post: Mapped["Post"] = relationship(back_populates="media_assets")


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_key: Mapped[str] = mapped_column(String(255), default="image.png")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="stories")


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("posts.id"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(50), default="America/Los_Angeles")
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus, native_enum=False), default=ScheduleStatus.PENDING
    )
    platform_targets: Mapped[list] = mapped_column(JSON)

    post: Mapped["Post"] = relationship(back_populates="schedule_entries")
    publish_attempts: Mapped[list["PublishAttempt"]] = relationship(
        back_populates="schedule_entry", cascade="all, delete-orphan"
    )


class PublishAttempt(Base):
    __tablename__ = "publish_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    schedule_entry_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("schedule_entries.id"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus, native_enum=False), default=PublishStatus.PENDING
    )
    platform_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    schedule_entry: Mapped["ScheduleEntry"] = relationship(back_populates="publish_attempts")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("posts.id"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentIdea(Base):
    __tablename__ = "content_ideas"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(500))
    theme: Mapped[str | None] = mapped_column(String(100), nullable=True)
    format: Mapped[ContentFormat] = mapped_column(
        Enum(ContentFormat, native_enum=False), default=ContentFormat.CAROUSEL
    )
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[IdeaStatus] = mapped_column(Enum(IdeaStatus, native_enum=False), default=IdeaStatus.IDEA)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="content_ideas")
