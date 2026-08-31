"""Dashboard aggregate stats."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Post, PostStatus, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    scheduled: int
    published: int
    in_review: int
    drafts: int
    total: int


class RecentPost(BaseModel):
    id: str
    title: str
    status: PostStatus
    created_at: str
    platform_count: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_posts: list[RecentPost]


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Post).where(Post.user_id == user.id)

    async def count_for(*statuses: PostStatus) -> int:
        result = await db.execute(
            select(func.count()).where(Post.user_id == user.id, Post.status.in_(statuses))
        )
        return result.scalar() or 0

    scheduled = await count_for(PostStatus.SCHEDULED)
    published = await count_for(PostStatus.PUBLISHED, PostStatus.PARTIALLY_PUBLISHED)
    in_review = await count_for(PostStatus.IN_REVIEW)
    drafts = await count_for(PostStatus.DRAFT, PostStatus.GENERATING, PostStatus.READY, PostStatus.APPROVED)

    total_result = await db.execute(select(func.count()).where(Post.user_id == user.id))
    total = total_result.scalar() or 0

    recent_result = await db.execute(
        base.order_by(Post.created_at.desc()).limit(5)
    )
    recent = recent_result.scalars().all()

    return DashboardResponse(
        stats=DashboardStats(
            scheduled=scheduled,
            published=published,
            in_review=in_review,
            drafts=drafts,
            total=total,
        ),
        recent_posts=[
            RecentPost(
                id=str(p.id),
                title=p.title,
                status=p.status,
                created_at=p.created_at.isoformat(),
                platform_count=0,
            )
            for p in recent
        ],
    )
