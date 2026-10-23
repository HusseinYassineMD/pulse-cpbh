"""Ideation helpers — trends-adjacent caption drafts and brainstorm chat (no post required)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.models import User
from app.services.ai import AIService

router = APIRouter(prefix="/ideation", tags=["ideation"])


class IdeationCaptionsRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    source_text: str = Field(..., min_length=1, max_length=12000)


class IdeationCaptionsResponse(BaseModel):
    instagram: str
    facebook: str
    linkedin: str


class IdeationChatTurn(BaseModel):
    role: str
    content: str


class IdeationChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[IdeationChatTurn] = Field(default_factory=list)
    context: str = Field(default="", max_length=8000)


class IdeationChatResponse(BaseModel):
    reply: str


@router.post("/captions", response_model=IdeationCaptionsResponse)
async def draft_captions(
    body: IdeationCaptionsRequest,
    user: User = Depends(get_current_user),
):
    _ = user
    ai = AIService()
    caps = await ai.generate_captions_from_source(body.title.strip(), body.source_text.strip())
    from app.models import Platform

    return IdeationCaptionsResponse(
        instagram=caps.get(Platform.INSTAGRAM, ""),
        facebook=caps.get(Platform.FACEBOOK, ""),
        linkedin=caps.get(Platform.LINKEDIN, ""),
    )


@router.post("/chat", response_model=IdeationChatResponse)
async def ideation_chat(
    body: IdeationChatRequest,
    user: User = Depends(get_current_user),
):
    _ = user
    ai = AIService()
    history = [{"role": t.role, "content": t.content} for t in body.history[-12:]]
    reply = await ai.ideation_brainstorm(body.message.strip(), history=history, context=body.context.strip())
    return IdeationChatResponse(reply=reply)
