"""Convert carousel slides to Instagram story format (1080×1920)."""

from pathlib import Path

from PIL import Image

STORY_SIZE = (1080, 1920)
CREAM = (250, 247, 242)


def carousel_to_story(src: Path, dest: Path) -> None:
    """Turn a square carousel slide into a vertical story slide."""
    img = Image.open(src).convert("RGB")
    w, h = img.size

    # Center crop to 9:16, then scale to 1080×1920
    target_ratio = 9 / 16
    current_ratio = w / h

    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        cropped = img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        cropped = img.crop((0, top, w, top + new_h))

    story = cropped.resize(STORY_SIZE, Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    story.save(dest, "PNG")


def make_story_caption(full_caption: str, max_len: int = 220) -> str:
    """Short caption for stories — hook line + key hashtags."""
    lines = [ln.strip() for ln in full_caption.splitlines() if ln.strip()]
    hook = lines[0] if lines else full_caption
    tags = [w for w in full_caption.split() if w.startswith("#")][:4]
    short = hook[:max_len].rstrip()
    if tags:
        short += "\n\n" + " ".join(tags)
    return short
