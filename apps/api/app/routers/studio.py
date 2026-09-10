"""Create Studio — free-form source to post."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas import PostResponse, StudioCreateRequest, StudioCreateResponse
from app.services.studio import create_from_source

router = APIRouter(prefix="/studio", tags=["studio"])


@router.post("/create", response_model=StudioCreateResponse)
async def studio_create(
    body: StudioCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.source_text.strip() and not body.template_id:
        raise HTTPException(
            status_code=400,
            detail="Paste your content or pick a carousel template (or both).",
        )

    try:
        post, message = await create_from_source(
            db,
            user_id=user.id,
            title=body.title,
            source_text=body.source_text,
            template_id=body.template_id,
            plan_idea_id=body.plan_idea_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await db.flush()
    return StudioCreateResponse(post=PostResponse.model_validate(post), message=message)
