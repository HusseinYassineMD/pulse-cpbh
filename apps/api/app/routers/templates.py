"""Post_Creator template listing."""

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models import User
from app.schemas import TemplateResponse
from app.services.templates import list_templates

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
async def get_templates(user: User = Depends(get_current_user)):
    templates = await list_templates()
    return [
        TemplateResponse(
            post_creator_id=t.id,
            title=t.title,
            slide_count=0,
            platforms=["instagram", "facebook", "linkedin"],
        )
        for t in templates
    ]
