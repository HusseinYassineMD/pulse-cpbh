"""AI-powered caption optimization and content review."""

from __future__ import annotations

from app.config import get_settings
from app.models import Platform
from app.schemas import AIOptimizeResponse, AIReviewResponse

PLATFORM_LIMITS = {
    Platform.INSTAGRAM: 2200,
    Platform.FACEBOOK: 63206,
    Platform.LINKEDIN: 3000,
}

PLATFORM_TONE = {
    Platform.INSTAGRAM: "engaging, emoji-friendly, visual storytelling",
    Platform.FACEBOOK: "conversational, community-focused, accessible",
    Platform.LINKEDIN: "professional, research-backed, thought leadership",
}

BRAND_GUIDELINES = """
Brand: USC Center for Personalized Brain Health (CPBH)
Voice: Authoritative yet approachable, evidence-based, empowering
Required hashtags: #BrainHealth #USCCPBH
Avoid: Unsubstantiated medical claims, fear-based messaging
Include: Prevention-focused framing, clinic CTA when appropriate
"""


class AIService:
    def __init__(self):
        self.settings = get_settings()

    async def optimize_caption(
        self, caption: str, platform: Platform
    ) -> AIOptimizeResponse:
        """Optimize a caption for a specific platform using AI."""
        if not self.settings.openai_api_key:
            return self._fallback_optimize(caption, platform)

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        char_limit = PLATFORM_LIMITS[platform]
        tone = PLATFORM_TONE[platform]

        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a social media expert for a USC brain health research center. "
                        f"Optimize captions for {platform.value}. "
                        f"Tone: {tone}. Max {char_limit} characters.\n{BRAND_GUIDELINES}"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Optimize this caption:\n\n{caption}",
                },
            ],
            temperature=0.7,
        )

        optimized = response.choices[0].message.content or caption
        hashtags = self._extract_hashtags(optimized)

        return AIOptimizeResponse(
            platform=platform,
            original_caption=caption,
            optimized_caption=optimized,
            hashtags=hashtags,
        )

    async def review_compliance(self, caption: str) -> AIReviewResponse:
        """Check caption for brand compliance and medical claim issues."""
        if not self.settings.openai_api_key:
            return AIReviewResponse(passed=True, issues=[], suggestions=[])

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Review this social media caption for a USC brain health center. "
                        "Check for: unsubstantiated medical claims, missing disclaimers, "
                        "off-brand tone, fear-based messaging. "
                        "Respond in JSON: {passed: bool, issues: [], suggestions: []}"
                        f"\n{BRAND_GUIDELINES}"
                    ),
                },
                {"role": "user", "content": caption},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        import json

        result = json.loads(response.choices[0].message.content or "{}")
        return AIReviewResponse(
            passed=result.get("passed", True),
            issues=result.get("issues", []),
            suggestions=result.get("suggestions", []),
        )

    def _fallback_optimize(self, caption: str, platform: Platform) -> AIOptimizeResponse:
        """Rule-based fallback when no AI API key is configured."""
        limit = PLATFORM_LIMITS[platform]
        trimmed = caption[:limit] if len(caption) > limit else caption
        return AIOptimizeResponse(
            platform=platform,
            original_caption=caption,
            optimized_caption=trimmed,
            hashtags=["#BrainHealth", "#USCCPBH", "#AlzheimersPrevention"],
        )

    def _extract_hashtags(self, text: str) -> list[str]:
        return [word for word in text.split() if word.startswith("#")]
