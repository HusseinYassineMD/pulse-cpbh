"""AI-powered caption optimization and content review."""

from __future__ import annotations

from app.config import get_settings
from app.models import PlanDeliverable, Platform
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

    async def generate_captions_from_source(
        self, title: str, source_text: str
    ) -> dict[Platform, str]:
        """Draft Instagram, Facebook, LinkedIn captions from free-form source."""
        platforms = [Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN]
        if not self.settings.openai_api_key:
            snippet = source_text.strip()[:400]
            base = f"{title}\n\n{snippet}" if snippet else title
            return {
                Platform.INSTAGRAM: base[:280],
                Platform.FACEBOOK: base[:600],
                Platform.LINKEDIN: base[:1200],
            }

        from openai import AsyncOpenAI
        import json

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Write social captions for USC CPBH from the user's source. Return JSON only: "
                        '{"instagram":"...","facebook":"...","linkedin":"..."} '
                        f"Respect limits: IG 2200, FB 63206, LI 3000 chars. {BRAND_GUIDELINES}"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Title: {title}\n\nSource material:\n{source_text[:12000]}",
                },
            ],
            temperature=0.6,
            response_format={"type": "json_object"},
        )
        raw = json.loads(response.choices[0].message.content or "{}")
        out: dict[Platform, str] = {}
        for plat in platforms:
            key = plat.value
            text = str(raw.get(key, "")).strip()
            if text:
                out[plat] = text[: PLATFORM_LIMITS[plat]]
        if len(out) < 3:
            snippet = source_text.strip()[:400]
            base = f"{title}\n\n{snippet}" if snippet else title
            for plat in platforms:
                if plat not in out:
                    out[plat] = base[: PLATFORM_LIMITS[plat]]
        return out

    async def chat_refine_captions(
        self,
        instruction: str,
        variants: list[tuple[Platform, str]],
        *,
        post_title: str = "",
        target_platform: Platform | None = None,
        history: list[dict[str, str]] | None = None,
        source_text: str = "",
    ) -> tuple[str, dict[Platform, str]]:
        """Apply a natural-language edit request to one or all platform captions."""
        if not variants:
            return ("Add captions first, then I can help refine them.", {})

        if not self.settings.openai_api_key:
            return self._fallback_chat_refine(instruction, variants, target_platform)

        from openai import AsyncOpenAI
        import json

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        scope = (
            f"Only change the {target_platform.value} caption."
            if target_platform
            else "Update each platform caption appropriately."
        )
        current = "\n\n".join(
            f"[{p.value.upper()}]\n{c}" for p, c in variants if not target_platform or p == target_platform
        )

        system = (
            "You are a CPBH social content assistant. The user asks for edits to post captions. "
            f"{scope} Return JSON only: "
            '{"reply":"brief friendly summary of what you changed",'
            '"captions":[{"platform":"instagram|facebook|linkedin","caption":"full new text"}]} '
            f"Respect platform character limits. {BRAND_GUIDELINES}"
        )
        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        if source_text.strip():
            messages.append(
                {
                    "role": "user",
                    "content": f"Original source material for context:\n{source_text[:6000]}",
                }
            )
            messages.append(
                {
                    "role": "assistant",
                    "content": "I have the source context and will use it when editing captions.",
                }
            )
        for turn in history or []:
            role = turn.get("role", "user")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": turn.get("content", "")[:4000]})
        messages.append(
            {
                "role": "user",
                "content": (
                    f"Post title: {post_title or 'Untitled'}\n\n"
                    f"Current captions:\n{current}\n\n"
                    f"User request: {instruction}"
                ),
            }
        )

        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=messages,
            temperature=0.6,
            response_format={"type": "json_object"},
        )

        raw = json.loads(response.choices[0].message.content or "{}")
        reply = str(raw.get("reply", "Updated your captions."))
        updates: dict[Platform, str] = {}
        for item in raw.get("captions", []):
            try:
                plat = Platform(str(item.get("platform", "")).lower())
                cap = str(item.get("caption", "")).strip()
                if cap and plat in {p for p, _ in variants}:
                    limit = PLATFORM_LIMITS[plat]
                    updates[plat] = cap[:limit]
            except ValueError:
                continue
        return reply, updates

    def _fallback_chat_refine(
        self,
        instruction: str,
        variants: list[tuple[Platform, str]],
        target_platform: Platform | None,
    ) -> tuple[str, dict[Platform, str]]:
        lower = instruction.lower()
        updates: dict[Platform, str] = {}
        for plat, caption in variants:
            if target_platform and plat != target_platform:
                continue
            text = caption
            if "short" in lower:
                text = caption[:280] if plat == Platform.INSTAGRAM else caption[:500]
            if "hashtag" in lower and "#BrainHealth" not in text:
                text = f"{text.rstrip()}\n\n#BrainHealth #USCCPBH"
            if "cta" in lower or "clinic" in lower:
                text = f"{text.rstrip()}\n\nLearn more at USC CPBH."
            updates[plat] = text
        return (
            "Applied a quick local edit (connect OpenAI for smarter rewrites).",
            updates,
        )

    async def summarize_for_pipeline(self, source_text: str, title: str = "") -> str:
        """Extract post-ready highlights from raw source content."""
        if not self.settings.openai_api_key:
            return self._fallback_summarize(source_text)

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        label = title or "content"
        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You summarize source material for USC Center for Personalized Brain Health social content. "
                        "Return bullet highlights (5-8 bullets) with key facts, quotes, and angles suitable for "
                        "Instagram/Facebook/LinkedIn posts. Plain text only, no markdown headers."
                        f"\n{BRAND_GUIDELINES}"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Summarize highlights for: {label}\n\n{source_text[:12000]}",
                },
            ],
            temperature=0.5,
        )
        return (response.choices[0].message.content or "").strip() or self._fallback_summarize(source_text)

    def _fallback_summarize(self, source_text: str) -> str:
        lines = [ln.strip() for ln in source_text.splitlines() if ln.strip()]
        if not lines:
            return "• Add source text, then summarize again."
        bullets = lines[:8]
        return "\n".join(f"• {line[:280]}" for line in bullets)

    async def generate_pipeline_output(
        self,
        content: str,
        title: str,
        output_type: PlanDeliverable,
        *,
        from_highlights: bool = False,
    ) -> str:
        """Draft a pipeline output (post, caption, story, etc.) from source or highlights."""
        if not content.strip():
            return "Add source or highlight content, then generate again."

        if not self.settings.openai_api_key:
            return self._fallback_pipeline_output(content, title, output_type, from_highlights=from_highlights)

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        label = title or "content"
        source_kind = "summarized highlights" if from_highlights else "raw source material"
        task = _PIPELINE_OUTPUT_INSTRUCTIONS[output_type]

        response = await client.chat.completions.create(
            model=self.settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You create content for USC Center for Personalized Brain Health (CPBH). "
                        f"Task: {task} "
                        "Plain text only — no markdown headers. Match CPBH voice: evidence-based, approachable, "
                        "prevention-focused. Include #BrainHealth #USCCPBH when appropriate."
                        f"\n{BRAND_GUIDELINES}"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Title/context: {label}\n"
                        f"Input ({source_kind}):\n\n{content[:12000]}"
                    ),
                },
            ],
            temperature=0.6,
        )
        draft = (response.choices[0].message.content or "").strip()
        return draft or self._fallback_pipeline_output(content, title, output_type, from_highlights=from_highlights)

    def _fallback_pipeline_output(
        self,
        content: str,
        title: str,
        output_type: PlanDeliverable,
        *,
        from_highlights: bool = False,
    ) -> str:
        """Rule-based draft when no AI key is configured."""
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        snippet = "\n".join(lines[:6]) if lines else content[:600]
        prefix = title.strip() or "CPBH update"
        tags = "\n\n#BrainHealth #USCCPBH"

        if output_type == PlanDeliverable.CAPTION:
            body = " ".join(lines[:2])[:260] if lines else snippet[:260]
            return f"{body}{tags}"

        if output_type == PlanDeliverable.STORY:
            slides = lines[:5] or [snippet[:120]]
            return "\n\n".join(f"Slide {i + 1}: {line[:140]}" for i, line in enumerate(slides))

        if output_type == PlanDeliverable.NEWSLETTER:
            intro = f"In this edition: {prefix}"
            return f"{intro}\n\n{snippet}\n\nLearn more at USC CPBH.{tags}"

        if output_type == PlanDeliverable.PATIENT_HANDOUT:
            bullets = lines[:6] if lines else [snippet[:200]]
            header = "Key points for patients and families:\n"
            return header + "\n".join(f"• {b[:240]}" for b in bullets)

        # Default: post
        hook = prefix if not from_highlights else f"From our latest research roundup: {prefix}"
        return f"{hook}\n\n{snippet}{tags}"


_PIPELINE_OUTPUT_INSTRUCTIONS: dict[PlanDeliverable, str] = {
    PlanDeliverable.POST: (
        "Write a ready-to-publish social post (2-4 short paragraphs). "
        "Strong hook, clear takeaway, optional CTA to USC CPBH."
    ),
    PlanDeliverable.CAPTION: (
        "Write one concise social caption (under 280 characters if possible). "
        "Engaging and on-brand."
    ),
    PlanDeliverable.STORY: (
        "Write Instagram story slide text (3-5 slides). Label each slide "
        "as 'Slide 1:', 'Slide 2:', etc. Short punchy lines per slide."
    ),
    PlanDeliverable.NEWSLETTER: (
        "Write a newsletter blurb: subject-line style title line, intro paragraph, "
        "2-3 bullet takeaways, closing CTA."
    ),
    PlanDeliverable.PATIENT_HANDOUT: (
        "Write patient-friendly bullet points (5-7 bullets). Plain language, "
        "no jargon, actionable and reassuring."
    ),
}
