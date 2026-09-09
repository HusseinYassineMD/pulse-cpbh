"""Content plan / sandbox — ideas backlog before posts exist."""

import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import (
    ContentFormat,
    ContentIdea,
    IdeaStatus,
    PlanDeliverable,
    Platform,
    Post,
    PostStatus,
    PostVariant,
    ScheduleEntry,
    ScheduleStatus,
    User,
)
from app.services.email import send_plan_assignment
from app.services.storage import delete_plan_source, save_plan_source

router = APIRouter(prefix="/plan", tags=["plan"])

ALLOWED_SOURCE_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".ppt",
    ".pptx",
    ".txt",
    ".md",
    ".csv",
    ".xlsx",
}


class TeamMember(BaseModel):
    name: str
    email: str


class PlanSourceFile(BaseModel):
    name: str
    filename: str
    url: str


def _parse_json_list(raw: str | None) -> list:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _dump_json_list(values: list | None) -> str | None:
    if not values:
        return None
    return json.dumps(values)


def _deliverable_to_format(deliverable: PlanDeliverable) -> ContentFormat:
    if deliverable == PlanDeliverable.STORY:
        return ContentFormat.STORY
    if deliverable in (PlanDeliverable.CAPTION, PlanDeliverable.NEWSLETTER):
        return ContentFormat.TEXT
    return ContentFormat.CAROUSEL


class PlanIdeaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    theme: str | None = None
    deliverable: PlanDeliverable = PlanDeliverable.POST
    format: ContentFormat | None = None  # legacy; derived from deliverable when omitted
    platforms: list[str] = Field(default_factory=list)
    target_date: date | None = None
    owner: str | None = None
    assignee_email: str | None = None
    status: IdeaStatus = IdeaStatus.IDEA
    notes: str | None = None
    substack_url: str | None = Field(default=None, max_length=2048)
    substack_publish_date: date | None = None
    notify_assignee: bool = False


class PlanIdeaUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    theme: str | None = None
    deliverable: PlanDeliverable | None = None
    format: ContentFormat | None = None
    platforms: list[str] | None = None
    target_date: date | None = None
    owner: str | None = None
    assignee_email: str | None = None
    status: IdeaStatus | None = None
    notes: str | None = None
    substack_url: str | None = Field(default=None, max_length=2048)
    substack_publish_date: date | None = None
    notify_assignee: bool = False


class PlanIdeaResponse(BaseModel):
    id: UUID
    title: str
    theme: str | None
    deliverable: PlanDeliverable | None
    format: ContentFormat
    platforms: list[str]
    source_files: list[PlanSourceFile]
    substack_url: str | None
    substack_publish_date: date | None
    target_date: date | None
    owner: str | None
    assignee_email: str | None
    post_id: UUID | None
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
    use_mailto: bool = False


class PlanIdeaWriteResponse(PlanIdeaResponse):
    notification: NotifyResponse | None = None


async def _maybe_notify(idea: ContentIdea, notify: bool) -> NotifyResponse | None:
    if not notify or not idea.assignee_email:
        return None
    ok, message, use_mailto = await send_plan_assignment(idea, idea.assignee_email)
    return NotifyResponse(ok=ok, message=message, use_mailto=use_mailto)


class SendToScheduleResponse(BaseModel):
    idea: PlanIdeaResponse
    post_id: UUID
    schedule_id: UUID
    scheduled_at: datetime


DEFAULT_PLATFORMS = [Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN]
SCHEDULE_TZ = "America/Los_Angeles"
WORK_QUEUE_STATUSES = {IdeaStatus.APPROVED, IdeaStatus.IN_PRODUCTION}


def _source_file_url(idea_id: UUID, filename: str) -> str:
    return f"/api/v1/media/plan/{idea_id}/{filename}"


def _to_response(idea: ContentIdea) -> PlanIdeaResponse:
    deliverable = idea.deliverable
    if deliverable is None:
        if idea.format == ContentFormat.STORY:
            deliverable = PlanDeliverable.STORY
        elif idea.format == ContentFormat.TEXT:
            deliverable = PlanDeliverable.CAPTION
        else:
            deliverable = PlanDeliverable.POST

    source_files = [
        PlanSourceFile(
            name=entry.get("name", entry.get("filename", "")),
            filename=entry["filename"],
            url=_source_file_url(idea.id, entry["filename"]),
        )
        for entry in _parse_json_list(idea.source_files)
        if isinstance(entry, dict) and entry.get("filename")
    ]

    return PlanIdeaResponse(
        id=idea.id,
        title=idea.title,
        theme=idea.theme,
        deliverable=deliverable,
        format=idea.format,
        platforms=[p for p in _parse_json_list(idea.platforms) if isinstance(p, str)],
        source_files=source_files,
        substack_url=idea.substack_url,
        substack_publish_date=idea.substack_publish_date,
        target_date=idea.target_date,
        owner=idea.owner,
        assignee_email=idea.assignee_email,
        post_id=idea.post_id,
        status=idea.status,
        notes=idea.notes,
        created_at=idea.created_at.isoformat(),
        updated_at=idea.updated_at.isoformat(),
    )


async def _get_idea(db: AsyncSession, idea_id: UUID, user_id: UUID) -> ContentIdea:
    result = await db.execute(
        select(ContentIdea).where(ContentIdea.id == idea_id, ContentIdea.user_id == user_id)
    )
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


def _idea_platforms(idea: ContentIdea) -> list[Platform]:
    raw = [p for p in _parse_json_list(idea.platforms) if isinstance(p, str)]
    platforms: list[Platform] = []
    for name in raw:
        try:
            platforms.append(Platform(name))
        except ValueError:
            continue
    return platforms or list(DEFAULT_PLATFORMS)


def _schedule_datetime(idea: ContentIdea) -> datetime:
    tz = ZoneInfo(SCHEDULE_TZ)
    if idea.target_date:
        dt = datetime.combine(idea.target_date, time(9, 0), tzinfo=tz)
        if dt <= datetime.now(tz):
            return datetime.now(tz) + timedelta(minutes=5)
        return dt
    return datetime.now(tz) + timedelta(hours=1)


async def _promote_idea_to_schedule(
    db: AsyncSession, idea: ContentIdea, user: User
) -> tuple[Post, ScheduleEntry]:
    if idea.status in (IdeaStatus.SCHEDULED, IdeaStatus.PUBLISHED) and idea.post_id:
        post = (
            await db.execute(select(Post).where(Post.id == idea.post_id, Post.user_id == user.id))
        ).scalar_one_or_none()
        if post:
            entry = (
                await db.execute(
                    select(ScheduleEntry)
                    .where(ScheduleEntry.post_id == post.id, ScheduleEntry.status != ScheduleStatus.CANCELLED)
                    .order_by(ScheduleEntry.scheduled_at.desc())
                )
            ).scalar_one_or_none()
            if entry:
                return post, entry

    platforms = _idea_platforms(idea)
    deliverable = idea.deliverable or PlanDeliverable.POST
    caption = (idea.notes or idea.title).strip()

    post = Post(
        user_id=user.id,
        title=idea.title,
        status=PostStatus.SCHEDULED,
        source_config={
            "type": deliverable.value,
            "content_idea_id": str(idea.id),
            "substack_url": idea.substack_url,
            "substack_publish_date": (
                idea.substack_publish_date.isoformat() if idea.substack_publish_date else None
            ),
            "theme": idea.theme,
        },
    )
    db.add(post)
    await db.flush()

    for platform in platforms:
        db.add(PostVariant(post_id=post.id, platform=platform, caption=caption))

    scheduled_at = _schedule_datetime(idea)
    entry = ScheduleEntry(
        post_id=post.id,
        scheduled_at=scheduled_at,
        timezone=SCHEDULE_TZ,
        platform_targets=[p.value for p in platforms],
    )
    db.add(entry)

    idea.post_id = post.id
    idea.status = IdeaStatus.SCHEDULED
    await db.flush()
    return post, entry


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


@router.post("", response_model=PlanIdeaWriteResponse, status_code=201)
async def create_idea(
    body: PlanIdeaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deliverable = body.deliverable
    content_format = body.format or _deliverable_to_format(deliverable)

    idea = ContentIdea(
        user_id=user.id,
        title=body.title,
        theme=body.theme,
        deliverable=deliverable,
        format=content_format,
        platforms=_dump_json_list(body.platforms),
        target_date=body.target_date,
        owner=body.owner,
        assignee_email=body.assignee_email,
        status=IdeaStatus.IDEA,
        notes=body.notes,
        substack_url=body.substack_url,
        substack_publish_date=body.substack_publish_date,
    )
    db.add(idea)
    await db.flush()
    await db.refresh(idea)

    notification = await _maybe_notify(idea, body.notify_assignee)
    return PlanIdeaWriteResponse(**_to_response(idea).model_dump(), notification=notification)


@router.patch("/{idea_id}", response_model=PlanIdeaWriteResponse)
async def update_idea(
    idea_id: UUID,
    body: PlanIdeaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)

    payload = body.model_dump(exclude_unset=True)
    notify = payload.pop("notify_assignee", False)
    platforms = payload.pop("platforms", None)

    for field, value in payload.items():
        setattr(idea, field, value)

    if platforms is not None:
        idea.platforms = _dump_json_list(platforms)

    if body.deliverable is not None and body.format is None:
        idea.format = _deliverable_to_format(body.deliverable)

    await db.flush()
    await db.refresh(idea)

    notification = await _maybe_notify(idea, notify)
    return PlanIdeaWriteResponse(**_to_response(idea).model_dump(), notification=notification)


@router.post("/{idea_id}/send-to-schedule", response_model=SendToScheduleResponse)
async def send_idea_to_schedule(
    idea_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)

    if idea.status not in WORK_QUEUE_STATUSES and idea.status != IdeaStatus.SCHEDULED:
        raise HTTPException(
            status_code=400,
            detail="Only approved or in-production ideas can be sent to schedule",
        )

    post, entry = await _promote_idea_to_schedule(db, idea, user)
    await db.refresh(idea)

    return SendToScheduleResponse(
        idea=_to_response(idea),
        post_id=post.id,
        schedule_id=entry.id,
        scheduled_at=entry.scheduled_at,
    )


@router.post("/{idea_id}/sources", response_model=PlanIdeaResponse)
async def upload_source(
    idea_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)

    original = Path(file.filename or "upload").name
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_SOURCE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Use: {', '.join(sorted(ALLOWED_SOURCE_EXTENSIONS))}",
        )

    import tempfile

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        stored = save_plan_source(idea_id, tmp_path, original)
    finally:
        tmp_path.unlink(missing_ok=True)

    entries = _parse_json_list(idea.source_files)
    entries.append({"name": original, "filename": stored})
    idea.source_files = json.dumps(entries)

    await db.flush()
    await db.refresh(idea)
    return _to_response(idea)


@router.delete("/{idea_id}/sources/{stored_name}", response_model=PlanIdeaResponse)
async def delete_source(
    idea_id: UUID,
    stored_name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)

    entries = [e for e in _parse_json_list(idea.source_files) if e.get("filename") != stored_name]
    idea.source_files = json.dumps(entries) if entries else None
    delete_plan_source(idea_id, stored_name)

    await db.flush()
    await db.refresh(idea)
    return _to_response(idea)


@router.post("/{idea_id}/notify", response_model=NotifyResponse)
async def notify_assignee(
    idea_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)
    if not idea.assignee_email:
        raise HTTPException(status_code=400, detail="No assignee email on this idea")

    ok, message, use_mailto = await send_plan_assignment(idea, idea.assignee_email)
    return NotifyResponse(ok=ok, message=message, use_mailto=use_mailto)


@router.delete("/{idea_id}", status_code=204)
async def delete_idea(
    idea_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _get_idea(db, idea_id, user.id)
    for entry in _parse_json_list(idea.source_files):
        if isinstance(entry, dict) and entry.get("filename"):
            delete_plan_source(idea_id, entry["filename"])
    await db.delete(idea)
