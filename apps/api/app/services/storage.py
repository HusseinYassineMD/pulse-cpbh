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
    return f"{settings.api_url}/api/v1/media/{post_id}/{filename}"
