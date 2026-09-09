"""Content pipeline — source → highlights → outputs."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models import PipelineItem, PipelineStage, PlanDeliverable, User
from app.services.ai import AIService

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineItemResponse(BaseModel):
    id: UUID
    stage: PipelineStage
    title: str
    body: str
    sort_order: int
    source_id: UUID | None
    highlight_id: UUID | None
    output_type: PlanDeliverable | None
    created_at: str
    updated_at: str


class PipelineListResponse(BaseModel):
    items: list[PipelineItemResponse]
    total: int


class PipelineCreateBody(BaseModel):
    stage: PipelineStage
    title: str = ""
    body: str = ""
    source_id: UUID | None = None
    highlight_id: UUID | None = None
    output_type: PlanDeliverable | None = None


class PipelineUpdateBody(BaseModel):
    title: str | None = None
    body: str | None = None
    stage: PipelineStage | None = None
    source_id: UUID | None = None
    highlight_id: UUID | None = None
    output_type: PlanDeliverable | None = None
    sort_order: int | None = None


class PipelineReorderBody(BaseModel):
    ids: list[UUID] = Field(min_length=1)


class SummarizeResponse(BaseModel):
    highlight: PipelineItemResponse


class GenerateOutputBody(BaseModel):
    output_type: PlanDeliverable = PlanDeliverable.POST
    source_id: UUID | None = None
    highlight_id: UUID | None = None


class GenerateOutputResponse(BaseModel):
    output: PipelineItemResponse


def _to_response(item: PipelineItem) -> PipelineItemResponse:
    return PipelineItemResponse(
        id=item.id,
        stage=item.stage,
        title=item.title or "",
        body=item.body or "",
        sort_order=item.sort_order,
        source_id=item.source_id,
        highlight_id=item.highlight_id,
        output_type=item.output_type,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


async def _get_item(db: AsyncSession, item_id: UUID, user_id: UUID) -> PipelineItem:
    result = await db.execute(
        select(PipelineItem).where(PipelineItem.id == item_id, PipelineItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Pipeline item not found")
    return item


async def _validate_links(
    db: AsyncSession,
    user_id: UUID,
    stage: PipelineStage,
    source_id: UUID | None,
    highlight_id: UUID | None,
) -> None:
    if stage == PipelineStage.HIGHLIGHT and source_id:
        await _get_item(db, source_id, user_id)
    if stage == PipelineStage.OUTPUT:
        if highlight_id:
            h = await _get_item(db, highlight_id, user_id)
            if h.stage != PipelineStage.HIGHLIGHT:
                raise HTTPException(status_code=400, detail="highlight_id must reference a highlight")
        if source_id:
            s = await _get_item(db, source_id, user_id)
            if s.stage != PipelineStage.SOURCE:
                raise HTTPException(status_code=400, detail="source_id must reference a source")


async def _next_sort(db: AsyncSession, user_id: UUID, stage: PipelineStage) -> int:
    result = await db.execute(
        select(PipelineItem.sort_order)
        .where(PipelineItem.user_id == user_id, PipelineItem.stage == stage)
        .order_by(PipelineItem.sort_order.desc())
        .limit(1)
    )
    top = result.scalar_one_or_none()
    return (top or 0) + 1


@router.get("", response_model=PipelineListResponse)
async def list_pipeline(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PipelineItem)
        .where(PipelineItem.user_id == user.id)
        .order_by(PipelineItem.stage, PipelineItem.sort_order, PipelineItem.created_at)
    )
    items = result.scalars().all()
    return PipelineListResponse(items=[_to_response(i) for i in items], total=len(items))


@router.post("", response_model=PipelineItemResponse, status_code=201)
async def create_item(
    body: PipelineCreateBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_links(db, user.id, body.stage, body.source_id, body.highlight_id)
    output_type = body.output_type
    if body.stage == PipelineStage.OUTPUT and not output_type:
        output_type = PlanDeliverable.POST
    item = PipelineItem(
        user_id=user.id,
        stage=body.stage,
        title=body.title.strip() or _default_title(body.stage),
        body=body.body,
        sort_order=await _next_sort(db, user.id, body.stage),
        source_id=body.source_id,
        highlight_id=body.highlight_id,
        output_type=output_type if body.stage == PipelineStage.OUTPUT else None,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _to_response(item)


@router.patch("/{item_id}", response_model=PipelineItemResponse)
async def update_item(
    item_id: UUID,
    body: PipelineUpdateBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_item(db, item_id, user.id)
    data = body.model_dump(exclude_unset=True)
    new_stage = data.get("stage", item.stage)
    new_source = data.get("source_id", item.source_id)
    new_highlight = data.get("highlight_id", item.highlight_id)
    await _validate_links(db, user.id, new_stage, new_source, new_highlight)

    for key, value in data.items():
        setattr(item, key, value)
    if new_stage != PipelineStage.OUTPUT:
        item.output_type = None
    await db.commit()
    await db.refresh(item)
    return _to_response(item)


@router.post("/reorder/{stage}", response_model=PipelineListResponse)
async def reorder_stage(
    stage: PipelineStage,
    body: PipelineReorderBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for idx, item_id in enumerate(body.ids):
        item = await _get_item(db, item_id, user.id)
        if item.stage != stage:
            raise HTTPException(status_code=400, detail="All items must belong to the same stage")
        item.sort_order = idx
    await db.commit()
    return await list_pipeline(user, db)


def _output_type_label(output_type: PlanDeliverable) -> str:
    return {
        PlanDeliverable.POST: "Post",
        PlanDeliverable.CAPTION: "Caption",
        PlanDeliverable.STORY: "Story",
        PlanDeliverable.NEWSLETTER: "Newsletter",
        PlanDeliverable.PATIENT_HANDOUT: "Patient handout",
    }[output_type]


@router.post("/generate-output", response_model=GenerateOutputResponse, status_code=201)
async def generate_output(
    body: GenerateOutputBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.source_id and not body.highlight_id:
        raise HTTPException(status_code=400, detail="Provide source_id and/or highlight_id")

    source: PipelineItem | None = None
    highlight: PipelineItem | None = None
    content = ""
    title = ""
    from_highlights = False

    if body.highlight_id:
        highlight = await _get_item(db, body.highlight_id, user.id)
        if highlight.stage != PipelineStage.HIGHLIGHT:
            raise HTTPException(status_code=400, detail="highlight_id must reference a highlight")
        content = highlight.body
        title = highlight.title or "Highlights"
        from_highlights = True
        if highlight.source_id:
            source = await _get_item(db, highlight.source_id, user.id)

    if body.source_id:
        src = await _get_item(db, body.source_id, user.id)
        if src.stage != PipelineStage.SOURCE:
            raise HTTPException(status_code=400, detail="source_id must reference a source")
        source = src
        if not content.strip():
            content = src.body
            title = src.title or "Source"
            from_highlights = False

    if not content.strip():
        raise HTTPException(status_code=400, detail="No content available to generate from")

    draft = await AIService().generate_pipeline_output(
        content,
        title,
        body.output_type,
        from_highlights=from_highlights,
    )
    type_label = _output_type_label(body.output_type)
    output = PipelineItem(
        user_id=user.id,
        stage=PipelineStage.OUTPUT,
        title=f"{type_label}: {title or 'Untitled'}",
        body=draft,
        sort_order=await _next_sort(db, user.id, PipelineStage.OUTPUT),
        source_id=source.id if source else None,
        highlight_id=highlight.id if highlight else None,
        output_type=body.output_type,
    )
    db.add(output)
    await db.commit()
    await db.refresh(output)
    return GenerateOutputResponse(output=_to_response(output))


@router.post("/{source_id}/summarize", response_model=SummarizeResponse, status_code=201)
async def summarize_source(
    source_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = await _get_item(db, source_id, user.id)
    if source.stage != PipelineStage.SOURCE:
        raise HTTPException(status_code=400, detail="Only source items can be summarized")
    if not source.body.strip():
        raise HTTPException(status_code=400, detail="Source has no content to summarize")

    summary = await AIService().summarize_for_pipeline(source.body, source.title)
    highlight = PipelineItem(
        user_id=user.id,
        stage=PipelineStage.HIGHLIGHT,
        title=f"Highlights: {source.title or 'Source'}",
        body=summary,
        sort_order=await _next_sort(db, user.id, PipelineStage.HIGHLIGHT),
        source_id=source.id,
    )
    db.add(highlight)
    await db.commit()
    await db.refresh(highlight)
    return SummarizeResponse(highlight=_to_response(highlight))


@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_item(db, item_id, user.id)
    await db.delete(item)
    await db.commit()


def _default_title(stage: PipelineStage) -> str:
    return {
        PipelineStage.SOURCE: "New source",
        PipelineStage.HIGHLIGHT: "New highlights",
        PipelineStage.OUTPUT: "New output",
    }[stage]
