"""Import a PDF carousel as a Pulse post (one slide per page)."""

from __future__ import annotations

import argparse
import asyncio
import sys
import tempfile
from pathlib import Path

import pymupdf
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.deps import _get_or_create_dev_user
from app.core.database import async_session
from app.models import MediaAsset, Platform, Post, PostStatus, PostVariant, PublishAttempt, ScheduleEntry
from app.services.post_queries import load_post_for_response
from app.services.storage import media_root, save_images


def render_pdf_pages(pdf_path: Path, output_dir: Path, dpi: int = 200) -> list[Path]:
    doc = pymupdf.open(pdf_path)
    scale = dpi / 72
    matrix = pymupdf.Matrix(scale, scale)
    paths: list[Path] = []

    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        out = output_dir / f"slide_{i + 1:02d}.png"
        pix.save(out)
        paths.append(out)

    return paths


async def import_images(
    image_paths: list[Path],
    *,
    title: str,
    post_creator_id: str | None = None,
    captions: dict[Platform, str] | None = None,
) -> Post:
    if not image_paths:
        raise ValueError("At least one image is required")

    async with async_session() as db:
        user = await _get_or_create_dev_user(db)

        post = Post(
            user_id=user.id,
            title=title,
            post_creator_id=post_creator_id,
            status=PostStatus.READY,
            source_config={"import": "images", "slide_count": len(image_paths)},
        )
        db.add(post)
        await db.flush()

        saved_files = save_images(post.id, image_paths)

        for i, filename in enumerate(saved_files):
            db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key=filename,
                    mime_type="image/png",
                    sort_order=i,
                )
            )

        caption_map = captions or {}
        if caption_map:
            for platform, caption in caption_map.items():
                db.add(PostVariant(post_id=post.id, platform=platform, caption=caption))
        else:
            placeholder = f"{title}\n\n#BrainHealth #USCCPBH #AirPollution"
            for platform in (Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN):
                db.add(PostVariant(post_id=post.id, platform=platform, caption=placeholder))

        await db.commit()
        return await load_post_for_response(db, post.id)


async def import_pdf(
    pdf_path: Path,
    *,
    title: str,
    post_creator_id: str | None = None,
    clear_existing: bool = False,
) -> Post:
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    async with async_session() as db:
        user = await _get_or_create_dev_user(db)

        captions: dict[Platform, str] = {}
        if clear_existing:
            posts = (
                await db.execute(
                    select(Post)
                    .where(Post.user_id == user.id)
                    .options(selectinload(Post.variants))
                )
            ).scalars().all()
            for post in posts:
                for variant in post.variants:
                    if variant.caption and variant.platform not in captions:
                        captions[variant.platform] = variant.caption

            post_ids = [p.id for p in posts]
            if post_ids:
                await db.execute(
                    delete(PublishAttempt).where(
                        PublishAttempt.schedule_entry_id.in_(
                            select(ScheduleEntry.id).where(ScheduleEntry.post_id.in_(post_ids))
                        )
                    )
                )
                await db.execute(delete(ScheduleEntry).where(ScheduleEntry.post_id.in_(post_ids)))
                await db.execute(delete(MediaAsset).where(MediaAsset.post_id.in_(post_ids)))
                await db.execute(delete(PostVariant).where(PostVariant.post_id.in_(post_ids)))
                await db.execute(delete(Post).where(Post.id.in_(post_ids)))

                posts_dir = media_root() / "posts"
                if posts_dir.exists():
                    import shutil

                    shutil.rmtree(posts_dir)
                    posts_dir.mkdir(parents=True, exist_ok=True)

        post = Post(
            user_id=user.id,
            title=title,
            post_creator_id=post_creator_id,
            status=PostStatus.READY,
            source_config={"import": "pdf", "source_file": pdf_path.name},
        )
        db.add(post)
        await db.flush()

        with tempfile.TemporaryDirectory() as tmp:
            image_paths = render_pdf_pages(pdf_path, Path(tmp))
            saved_files = save_images(post.id, image_paths)

        for i, filename in enumerate(saved_files):
            db.add(
                MediaAsset(
                    post_id=post.id,
                    s3_key=filename,
                    mime_type="image/png",
                    sort_order=i,
                )
            )

        if captions:
            for platform, caption in captions.items():
                db.add(PostVariant(post_id=post.id, platform=platform, caption=caption))
        else:
            placeholder = f"{title}\n\n#BrainHealth #USCCPBH"
            for platform in (Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN):
                db.add(PostVariant(post_id=post.id, platform=platform, caption=placeholder))

        await db.commit()
        return await load_post_for_response(db, post.id)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a PDF carousel into Pulse")
    parser.add_argument("pdf", type=Path, help="Path to PDF file")
    parser.add_argument("--title", default="Exercise, Sitting, and APOE4")
    parser.add_argument("--template", default="exercise-apoe4", dest="post_creator_id")
    parser.add_argument("--clear", action="store_true", help="Remove existing posts first")
    args = parser.parse_args()

    post = asyncio.run(
        import_pdf(
            args.pdf,
            title=args.title,
            post_creator_id=args.post_creator_id,
            clear_existing=args.clear,
        )
    )
    print(f"✓ Imported {args.pdf.name} → post {post.id}")
    print(f"  Title: {post.title}")
    print(f"  Slides: {len(post.media_assets)}")
    print(f"  Captions: {len(post.variants)}")


if __name__ == "__main__":
    main()
