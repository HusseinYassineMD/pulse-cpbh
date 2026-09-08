"""Parse and run generation commands."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Post, PostStatus
from app.services.content import ContentService
from app.services.templates import list_templates


class CommandAction(str, Enum):
    POST = "post"
    STORY = "story"
    CAPTIONS = "captions"
    HELP = "help"


@dataclass
class ParsedCommand:
    action: CommandAction
    template_id: str | None = None
    raw: str = ""


HELP_TEXT = """
Commands:
  post <topic>       → carousel post (slides + captions)
  captions <topic>   → captions only (no images)
  help               → show this help

Topics (templates):
  exercise-apoe4     — Exercise, Sitting, and APOE4
  protein-maxing     — Protein Maxing

Examples:
  post exercise-apoe4
  captions protein
""".strip()


async def resolve_template(query: str | None) -> str:
    if not query:
        raise ValueError("Tell me which topic — e.g. post exercise-apoe4")

    templates = await list_templates()
    if not templates:
        raise ValueError("No templates found. Is Post_Creator connected?")

    q = query.lower().strip()

    for t in templates:
        if t.id == q or t.id.replace("-", "") == q.replace("-", ""):
            return t.id

    for t in templates:
        if q in t.id or q in t.title.lower():
            return t.id

    names = ", ".join(t.id for t in templates)
    raise ValueError(f"Unknown topic '{query}'. Try: {names}")


async def parse_command(text: str) -> ParsedCommand:
    raw = text.strip()
    if not raw:
        raise ValueError("Type a command — try: post exercise-apoe4")

    parts = raw.split()
    action_word = parts[0].lower()

    if action_word in ("help", "?"):
        return ParsedCommand(action=CommandAction.HELP, raw=raw)

    if action_word == "story":
        raise ValueError("Stories aren't available right now — use: post <topic>")

    if action_word not in ("post", "captions"):
        # Shorthand: "exercise-apoe4" defaults to post
        template_id = await resolve_template(raw)
        return ParsedCommand(action=CommandAction.POST, template_id=template_id, raw=raw)

    if len(parts) < 2:
        raise ValueError(f"'{action_word}' needs a topic — e.g. {action_word} exercise-apoe4")

    template_id = await resolve_template(parts[1])
    return ParsedCommand(
        action=CommandAction(action_word),
        template_id=template_id,
        raw=raw,
    )


@dataclass
class CommandResult:
    message: str
    post: Post | None = None
    help_text: str | None = None


async def run_command(db: AsyncSession, user_id, command_text: str) -> CommandResult:
    parsed = await parse_command(command_text)

    if parsed.action == CommandAction.HELP:
        templates = await list_templates()
        topics = "\n".join(f"  • {t.id} — {t.title}" for t in templates) or "  (none found)"
        return CommandResult(
            message="Here's what you can run:",
            help_text=f"{HELP_TEXT}\n\nAvailable now:\n{topics}",
        )

    templates = await list_templates()
    title = next((t.title for t in templates if t.id == parsed.template_id), parsed.template_id)

    action_labels = {
        CommandAction.POST: "Post",
        CommandAction.STORY: "Story",
        CommandAction.CAPTIONS: "Captions",
    }

    post = Post(
        user_id=user_id,
        title=f"{action_labels[parsed.action]}: {title}",
        post_creator_id=parsed.template_id,
        status=PostStatus.DRAFT,
        source_config={"command": parsed.raw, "type": parsed.action.value},
    )
    db.add(post)
    await db.flush()

    service = ContentService(db)
    post = await service.generate(post.id, mode=parsed.action.value)

    labels = {
        "post": f"Created carousel with {len(post.media_assets)} slides",
        "story": "Created story slide",
        "captions": f"Generated {len(post.variants)} captions",
    }
    return CommandResult(
        message=labels.get(parsed.action.value, "Done"),
        post=post,
    )
