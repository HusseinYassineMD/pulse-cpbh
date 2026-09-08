"""Serialize stories with image URLs."""

from app.models import Story
from app.schemas import StoryResponse


def story_to_response(story: Story) -> StoryResponse:
    return StoryResponse(
        id=story.id,
        title=story.title,
        source_url=story.source_url,
        image_url=f"/api/media/stories/{story.id}/{story.image_key}",
        created_at=story.created_at,
        updated_at=story.updated_at,
    )
