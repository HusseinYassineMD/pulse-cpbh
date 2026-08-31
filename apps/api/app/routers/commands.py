"""Command studio — generate posts, stories, captions from text commands."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas import PostResponse
from app.services.commands import run_command
from app.services.serialize import post_to_response

router = APIRouter(prefix="/commands", tags=["commands"])


class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    message: str
    help_text: str | None = None
    post: PostResponse | None = None


@router.post("/run", response_model=CommandResponse)
async def execute_command(
    body: CommandRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await run_command(db, user.id, body.command)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CommandResponse(
        message=result.message,
        help_text=result.help_text,
        post=post_to_response(result.post) if result.post else None,
    )
