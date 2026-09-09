"""Content plan / sandbox — ideas backlog before posts exist."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import ContentFormat, ContentIdea, IdeaStatus, User
from app.services.email import send_plan_assignment

router = APIRouter(prefix="/plan", tags=["plan"])


class TeamMember(BaseModel):
    name: str
    email: str


class PlanIdeaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    theme: str | None = None
    format: ContentFormat = ContentFormat.CAROUSEL
    target_date: date | None = None
    owner: str | None = None
    assignee_email: str | None = None
    status: IdeaStatus = IdeaStatus.IDEA
    notes: str | None = None
    notify_assignee: bool = False


class PlanIdeaUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    theme: str | None = None
    format: ContentFormat | None = None
    target_date: date | None = None
    owner: str | None = None
    assignee_email: str | None = None
    status: IdeaStatus | None = None
    notes: str | None = None
    notify_assignee: bool = False


class PlanIdeaResponse(BaseModel):
    id: UUID
    title: str
    theme: str | None
    format: ContentFormat
    target_date: date | None
    owner: str | None
    assignee_email: str | None
    status: IdeaStatus
    notes: str | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class PlanListResponse(BaseModel):
    items: list[PlanIdeaResponse]
    total: int


class NotifyResponse(BaseModel):
    ok: bool
    message: str


def _to_response(idea: ContentIdea) -> PlanIdeaResponse:
    return PlanIdeaResponse(
        id=idea.id,
        title=idea.title,
        theme=idea.theme,
        format=idea.format,
        target_date=idea.target_date,
        owner=idea.owner,
        assignee_email=idea.assignee_email,
        status=idea.status,
        notes=idea.notes,
        created_at=idea.created_at.isoformat(),
        updated_at=idea.updated_at.isoformat(),
    )


@router.get("/team", response_model=list[TeamMember])
async def list_team(user: User = Depends(get_current_user)):
    return [TeamMember(**m) for m in get_settings().plan_team_members()]


@router.get("", response_model=PlanListResponse)
async def list_ideas(
    status: IdeaStatus | None = None,
    theme: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentIdea).where(ContentIdea.user_id == user.id)
    count_query = select(func.count()).select_from(ContentIdea).where(ContentIdea.user_id == user.id)

    if status:
        query = query.where(ContentIdea.status == status)
        count_query = count_query.where(ContentIdea.status == status)
    if theme:
        query = query.where(ContentIdea.theme == theme)
        count_query = count_query.where(ContentIdea.theme == theme)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(
            ContentIdea.target_date.asc().nulls_last(),
            ContentIdea.created_at.desc(),
        )
        .offset(skip)
        .limit(limit)
    )
    items = result.scalars().all()
    return PlanListResponse(items=[_to_response(i) for i in items], total=total)


@router.post("", response_model=PlanIdeaResponse, status_code=201)
async def create_idea(
    body: PlanIdeaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = ContentIdea(
        user_id=user.id,
        title=body.title,
        theme=body.theme,
        format=body.format,
        target_date=body.target_date,
        owner=body.owner,
        assignee_email=body.assignee_email,
        status=IdeaStatus.IDEA,  # new ideas always start in parking lot
        notes=body.notes,
    )
    db.add(idea)
    await db.flush()
    await db.refresh(idea)

    if body.notify_assignee and body.assignee_email:
        await send_plan_assignment(idea, body.assignee_email)

    return _to_response(idea)


@router.patch("/{idea_id}", response_model=PlanIdeaResponse)
async def update_idea(
    idea_id: UUID,
    body: PlanIdeaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentIdea).where(ContentIdea.id == idea_id, ContentIdea.user_id == user.id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    payload = body.model_dump(exclude_unset=True)
    notify = payload.pop("notify_assignee", False)
    for field, value in payload.items():
        setattr(idea, field, value)

    await db.flush()
    await db.refresh(idea)

    email = idea.assignee_email
    if notify and email:
        await send_plan_assignment(idea, email)

    return _to_response(idea)


@router.post("/{idea_id}/notify", response_model=NotifyResponse)
async def notify_assignee(
    idea_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentIdea).where(ContentIdea.id == idea_id, ContentIdea.user_id == user.id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not idea.assignee_email:
        raise HTTPException(status_code=400, detail="No assignee email on this idea")

    ok, message = await send_plan_assignment(idea, idea.assignee_email)
    if not ok:
        raise HTTPException(status_code=502, detail=message)
    return NotifyResponse(ok=True, message=message)


@router.delete("/{idea_id}", status_code=204)
async def delete_idea(
    idea_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentIdea).where(ContentIdea.id == idea_id, ContentIdea.user_id == user.id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    await db.delete(idea)
