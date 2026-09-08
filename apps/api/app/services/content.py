"""Content generation service — wraps Post_Creator pipeline."""

from __future__ import annotations

import asyncio
import json
import tempfile
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import MediaAsset, Platform, Post, PostStatus, PostVariant
from app.services.post_queries import load_post_for_response
from app.services.storage import clear_post_media, post_media_dir, save_images
from app.services.story import carousel_to_story, make_story_caption
from app.services.templates import _post_creator_python


@dataclass
class GeneratedContent:
    manifest: dict
    captions: dict[str, str]
    image_paths: list[Path]


class ContentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    async def generate(self, post_id: UUID, mode: str = "post") -> Post:
        post = await self._get_post(post_id)
        post.status = PostStatus.GENERATING
        await self.db.flush()

        if not post.post_creator_id:
            raise ValueError("Pick a template before generating")

        with tempfile.TemporaryDirectory() as tmp_dir:
            content = await self._run_post_creator(post.post_creator_id, Path(tmp_dir))
            await self._persist_content(post, content, mode=mode)

        post.status = PostStatus.READY
        await self.db.flush()
        return await load_post_for_response(self.db, post_id)

    async def _get_post(self, post_id: UUID) -> Post:
        result = await self.db.execute(
            select(Post)
            .where(Post.id == post_id)
            .options(selectinload(Post.variants), selectinload(Post.media_assets))
        )
        post = result.scalar_one_or_none()
        if not post:
            raise ValueError(f"Post {post_id} not found")
        return post

    async def _run_post_creator(self, post_creator_id: str, output_dir: Path) -> GeneratedContent:
        root = self.settings.resolved_post_creator_path
        script = root / "generate.py"

        if not script.exists():
            raise FileNotFoundError(
                f"Post_Creator not found at {root}. "
                "Set POST_CREATOR_PATH in .env (default: ../Post_Creator)"
            )

        proc = await asyncio.create_subprocess_exec(
            str(_post_creator_python()),
            str(script),
            "--post",
            post_creator_id,
            "--output",
            str(output_dir),
            cwd=str(root),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            err = stderr.decode().strip() or "Unknown error"
            raise RuntimeError(f"Post_Creator failed: {err}")

        subdirs = [d for d in output_dir.iterdir() if d.is_dir()]
        if not subdirs:
            raise RuntimeError("Post_Creator produced no output")

        result_dir = subdirs[0]
        manifest = json.loads((result_dir / "manifest.json").read_text())

        captions = {}
        for platform in ["instagram", "facebook", "linkedin"]:
            caption_file = result_dir / f"caption_{platform}.txt"
            if caption_file.exists():
                captions[platform] = caption_file.read_text(encoding="utf-8").strip()

        image_dir = result_dir / "images"
        image_paths = sorted(image_dir.glob("*.png")) if image_dir.exists() else []

        return GeneratedContent(manifest=manifest, captions=captions, image_paths=image_paths)

    async def _persist_content(self, post: Post, content: GeneratedContent, mode: str = "post") -> None:
        post.title = content.manifest.get("title", post.title)
        if mode == "story":
            post.title = f"Story: {post.title}"

        for variant in list(post.variants):
            await self.db.delete(variant)
        for asset in list(post.media_assets):
            await self.db.delete(asset)
        await self.db.flush()

        clear_post_media(post.id)

        platform_map = {
            "instagram": Platform.INSTAGRAM,
            "facebook": Platform.FACEBOOK,
            "linkedin": Platform.LINKEDIN,
        }

        if mode == "captions":
            for platform_key, caption in content.captions.items():
                platform = platform_map.get(platform_key)
                if platform:
                    self.db.add(PostVariant(post_id=post.id, platform=platform, caption=caption))
            await self.db.flush()
            return

        if mode == "story":
            if not content.image_paths:
                raise RuntimeError("No slides to convert to story")

            dest_dir = post_media_dir(post.id)
            story_path = dest_dir / "story_01.png"
            carousel_to_story(content.image_paths[0], story_path)

            ig_caption = content.captions.get("instagram", "")
            short = make_story_caption(ig_caption)
            self.db.add(
                PostVariant(post_id=post.id, platform=Platform.INSTAGRAM, caption=short)
            )
            self.db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key="story_01.png",
                    mime_type="image/png",
                    sort_order=0,
                )
            )
            await self.db.flush()
            return

        # Default: full carousel post
        saved_files = save_images(post.id, content.image_paths)

        for platform_key, caption in content.captions.items():
            platform = platform_map.get(platform_key)
            if platform:
                self.db.add(PostVariant(post_id=post.id, platform=platform, caption=caption))

        for i, filename in enumerate(saved_files):
            self.db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key=filename,
                    mime_type="image/png",
                    sort_order=i,
                )
            )

        await self.db.flush()
