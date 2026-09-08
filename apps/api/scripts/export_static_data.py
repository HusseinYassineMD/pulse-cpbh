"""Export posts, plan, and media for GitHub Pages static build."""

from __future__ import annotations

import asyncio
import json
import shutil
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import selectinload

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import async_session
from app.models import ContentIdea, Post
from app.services.serialize import post_to_response

ROOT = Path(__file__).resolve().parents[2]
WEB_PUBLIC = ROOT / "web" / "public"
DATA_DIR = WEB_PUBLIC / "data"
MEDIA_DIR = WEB_PUBLIC / "media"
API_MEDIA = ROOT / "api" / "media" / "posts"


async def export_static() -> None:
    async with async_session() as db:
        posts = (
            await db.execute(
                select(Post)
                .options(selectinload(Post.variants), selectinload(Post.media_assets))
                .order_by(Post.created_at.desc())
            )
        ).scalars().all()
        ideas = (await db.execute(select(ContentIdea))).scalars().all()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if MEDIA_DIR.exists():
        shutil.rmtree(MEDIA_DIR)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    items = []
    for post in posts:
        resp = post_to_response(post)
        data = resp.model_dump(mode="json")
        for asset in data["media_assets"]:
            asset["url"] = f"/media/{post.id}/{asset['s3_key']}"
        items.append(data)

        src = API_MEDIA / str(post.id)
        if src.exists():
            dest = MEDIA_DIR / str(post.id)
            shutil.copytree(src, dest)

    (DATA_DIR / "posts.json").write_text(
        json.dumps({"version": 3, "items": items, "total": len(items)}, indent=2)
    )

    plan_items = [
        {
            "id": str(i.id),
            "title": i.title,
            "theme": i.theme,
            "format": i.format.value,
            "target_date": i.target_date.isoformat() if i.target_date else None,
            "owner": i.owner,
            "status": i.status.value,
            "notes": i.notes,
            "created_at": i.created_at.isoformat(),
            "updated_at": i.updated_at.isoformat(),
        }
        for i in ideas
    ]
    (DATA_DIR / "plan.json").write_text(json.dumps({"items": plan_items, "total": len(plan_items)}, indent=2))
    print(f"✓ Exported {len(items)} posts and {len(plan_items)} plan ideas → apps/web/public/")


def main() -> None:
    asyncio.run(export_static())


if __name__ == "__main__":
    main()
