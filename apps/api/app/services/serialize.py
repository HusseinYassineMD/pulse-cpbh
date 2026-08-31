"""Serialize posts with media URLs."""

from uuid import UUID

from app.config import get_settings
from app.models import Post
from app.schemas import MediaAssetResponse, PostResponse, PostVariantResponse


def post_to_response(post: Post) -> PostResponse:
    return PostResponse(
        id=post.id,
        title=post.title,
        status=post.status,
        post_creator_id=post.post_creator_id,
        source_config=post.source_config,
        created_at=post.created_at,
        updated_at=post.updated_at,
        variants=[PostVariantResponse.model_validate(v) for v in post.variants],
        media_assets=[
            MediaAssetResponse(
                id=a.id,
                s3_key=a.s3_key,
                mime_type=a.mime_type,
                sort_order=a.sort_order,
                alt_text=a.alt_text,
        url=f"/api/media/{post.id}/{a.s3_key}",
            )
            for a in sorted(post.media_assets, key=lambda x: x.sort_order)
        ],
    )
