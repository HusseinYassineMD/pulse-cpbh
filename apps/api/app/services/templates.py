"""List available Post_Creator templates."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings


@dataclass
class Template:
    id: str
    title: str


def _post_creator_python() -> Path | str:
    settings = get_settings()
    root = settings.resolved_post_creator_path
    venv_python = root / ".venv" / "bin" / "python"
    if venv_python.exists():
        return venv_python
    return "python3"


async def list_templates() -> list[Template]:
    settings = get_settings()
    root = settings.resolved_post_creator_path
    script = root / "generate.py"

    if not script.exists():
        return []

    proc = await asyncio.create_subprocess_exec(
        str(_post_creator_python()),
        str(script),
        "--list",
        cwd=str(root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        return []

    templates: list[Template] = []
    for line in stdout.decode().splitlines():
        match = re.match(r"\s+([\w-]+):\s+(.+)", line)
        if match:
            templates.append(Template(id=match.group(1), title=match.group(2).strip()))

    return templates
