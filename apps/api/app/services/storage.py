"""Save generated images to local disk (no S3 needed)."""

import shutil
from pathlib import Path
from uuid import UUID

from app.config import get_settings


def media_root() -> Path:
    root = Path(__file__).resolve().parents[2] / "media"
    root.mkdir(parents=True, exist_ok=True)
    return root


def post_media_dir(post_id: UUID) -> Path:
    path = media_root() / "posts" / str(post_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def clear_post_media(post_id: UUID) -> None:
    path = media_root() / "posts" / str(post_id)
    if path.exists():
        shutil.rmtree(path)


def story_media_dir(story_id: UUID) -> Path:
    path = media_root() / "stories" / str(story_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def clear_story_media(story_id: UUID) -> None:
    path = media_root() / "stories" / str(story_id)
    if path.exists():
        shutil.rmtree(path)


def save_story_image(story_id: UUID, src: Path, ext: str = ".png") -> str:
    dest_dir = story_media_dir(story_id)
    filename = f"image{ext}"
    shutil.copy2(src, dest_dir / filename)
    return filename


def plan_media_dir(idea_id: UUID) -> Path:
    path = media_root() / "plan" / str(idea_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_plan_source(idea_id: UUID, src: Path, original_name: str) -> str:
    """Store a source file; returns stored filename."""
    dest_dir = plan_media_dir(idea_id)
    safe = Path(original_name).name.replace(" ", "_")
    dest = dest_dir / safe
    if dest.exists():
        stem = dest.stem
        suffix = dest.suffix
        n = 2
        while dest.exists():
            dest = dest_dir / f"{stem}_{n}{suffix}"
            n += 1
    shutil.copy2(src, dest)
    return dest.name


def delete_plan_source(idea_id: UUID, stored_name: str) -> None:
    path = plan_media_dir(idea_id) / stored_name
    if path.exists():
        path.unlink()


def save_images(post_id: UUID, image_paths: list[Path]) -> list[str]:
    """Copy images into media/posts/{id}/. Returns stored filenames."""
    dest_dir = post_media_dir(post_id)
    saved: list[str] = []

    for i, src in enumerate(image_paths):
        filename = f"slide_{i + 1:02d}.png"
        dest = dest_dir / filename
        shutil.copy2(src, dest)
        saved.append(filename)

    return saved


def media_url(post_id: UUID, filename: str) -> str:
    settings = get_settings()
    return f"{settings.effective_api_url}/api/v1/media/{post_id}/{filename}"
