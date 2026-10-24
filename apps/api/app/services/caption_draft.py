"""Punchy social captions without OpenAI — hooks, emojis, CPBH hashtags."""

from __future__ import annotations

import re

HASHTAGS_IG = "#BrainHealth #USCCPBH #SleepHealth #CognitiveHealth"
HASHTAGS_FB = "#BrainHealth #USCCPBH #AlzheimersPrevention"
HASHTAGS_LI = "#BrainHealth #USCCPBH #Neuroscience #PublicHealth"
CTA = "💙 USC Center for Personalized Brain Health — science-backed tips for everyday brain wellness."


def _theme(text: str) -> str:
    t = text.lower()
    if re.search(r"\b(sleep|insomnia|circadian|rest)\b", t):
        return "sleep"
    if re.search(r"\b(diet|nutrition|food|omega)\b", t):
        return "nutrition"
    if re.search(r"\b(exercise|walk|movement|fitness)\b", t):
        return "exercise"
    if re.search(r"\b(memory|cognitive|alzheimer|dementia)\b", t):
        return "memory"
    return "general"


def _hook(theme: str, topic: str) -> str:
    short = re.split(r"[.!?]", topic, maxsplit=1)[0].strip()[:90] or topic[:90]
    hooks = {
        "sleep": f'🌙 Sleep and your brain — let\'s clear up the confusion.\n"{short}"',
        "nutrition": f'🥗 Food choices matter for brain health.\n"{short}"',
        "exercise": f"🚶‍♀️ Movement is brain medicine.\n\"{short}\"",
        "memory": f'🧠 Memory questions? You\'re not alone.\n"{short}"',
        "general": f'✨ Brain health, explained simply.\n"{short}"',
    }
    return hooks.get(theme, hooks["general"])


def _body(notes: str, topic: str) -> str:
    raw = re.sub(r"\s+", " ", (notes.strip() or topic.strip()))
    if not raw:
        return "Small daily habits add up — especially for long-term brain health."
    parts = re.split(r"(?<=[.!?])\s+", raw)
    parts = [p for p in parts if p]
    if len(parts) >= 2:
        return " ".join(parts[:3])
    if len(raw) > 120:
        return raw[:200].rstrip() + "…"
    return (
        f"{raw}\n\nHere's the patient-friendly takeaway: stay curious, keep routines steady, "
        "and talk with your care team when something feels off."
    )


def draft_social_captions(title: str, source_text: str) -> dict[str, str]:
    topic = title.strip() or "Brain health"
    notes = source_text.strip() or topic
    theme = _theme(f"{topic} {notes}")
    open_line = _hook(theme, topic)
    body = _body(notes, topic)

    instagram = f"{open_line}\n\n{body}\n\n{CTA}\n\n{HASHTAGS_IG}"[:2200]
    facebook = f"{open_line}\n\n{body}\n\n{CTA}\n\n{HASHTAGS_FB}"[:600]
    linkedin = f"{topic}\n\n{body}\n\n{CTA}\n\n{HASHTAGS_LI}"[:1200]
    return {"instagram": instagram, "facebook": facebook, "linkedin": linkedin}
