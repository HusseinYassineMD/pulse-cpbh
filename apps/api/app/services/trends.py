"""Fetch recent brain-health headlines from public RSS feeds."""

from __future__ import annotations

import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

from app.models import PlanDeliverable

USER_AGENT = "Pulse-CPBH/1.0 (USC brain health content tool)"

# Public RSS — no API keys required
TREND_FEEDS: list[tuple[str, str, bool]] = [
    (
        "Google News",
        "https://news.google.com/rss/search?q=brain+health+OR+Alzheimer+prevention+OR+cognitive+decline&hl=en-US&gl=US&ceid=US:en",
        False,
    ),
    (
        "Google News · Research",
        "https://news.google.com/rss/search?q=cognitive+decline+prevention+research+study&hl=en-US&gl=US&ceid=US:en",
        False,
    ),
    (
        "BBC Health",
        "http://feeds.bbci.co.uk/news/health/rss.xml",
        True,
    ),
    (
        "MedlinePlus",
        "https://medlineplus.gov/groupfeeds/new.xml",
        True,
    ),
]

BRAIN_KEYWORDS = re.compile(
    r"\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|"
    r"tau|parkinson|stroke|mental\s+health|sleep|exercise|nutrition|"
    r"mind|aging|prevention|glymphatic)\b",
    re.I,
)

STRICT_BRAIN_KEYWORDS = re.compile(
    r"\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|"
    r"tau|parkinson|stroke|glymphatic|neurolog)\b",
    re.I,
)


@dataclass
class RawTrend:
    title: str
    url: str
    source: str
    summary: str
    published_at: datetime | None


def _strip_html(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", cleaned).strip()


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value[:25], fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _parse_rss(xml_bytes: bytes, source: str) -> list[RawTrend]:
    root = ET.fromstring(xml_bytes)
    items: list[RawTrend] = []

    for node in root.iter():
        if _local(node.tag) != "item":
            continue
        title = ""
        link = ""
        summary = ""
        published: datetime | None = None
        for child in node:
            name = _local(child.tag)
            text = (child.text or "").strip()
            if name == "title":
                title = text
            elif name == "link" and text:
                link = text
            elif name in ("description", "summary") and text:
                summary = _strip_html(text)
            elif name in ("pubDate", "published", "updated") and text:
                published = _parse_date(text)
        if title and link:
            items.append(
                RawTrend(
                    title=title,
                    url=link,
                    source=source,
                    summary=summary[:400],
                    published_at=published,
                )
            )

    if items:
        return items

    # Atom fallback
    for entry in root.iter():
        if _local(entry.tag) != "entry":
            continue
        title = ""
        link = ""
        summary = ""
        published: datetime | None = None
        for child in entry:
            name = _local(child.tag)
            if name == "title":
                title = (child.text or "").strip()
            elif name == "link" and child.attrib.get("href"):
                link = child.attrib["href"]
            elif name in ("summary", "content") and (child.text or "").strip():
                summary = _strip_html(child.text or "")
            elif name in ("published", "updated") and (child.text or "").strip():
                published = _parse_date(child.text)
        if title and link:
            items.append(
                RawTrend(
                    title=title,
                    url=link,
                    source=source,
                    summary=summary[:400],
                    published_at=published,
                )
            )
    return items


async def _fetch_feed(client: httpx.AsyncClient, source: str, url: str) -> list[RawTrend]:
    try:
        response = await client.get(url)
        response.raise_for_status()
        return _parse_rss(response.content, source)
    except Exception:
        return []


def _trend_id(title: str, url: str) -> str:
    return hashlib.sha256(f"{title}|{url}".encode()).hexdigest()[:16]


def _guess_theme(title: str, summary: str) -> str:
    text = f"{title} {summary}".lower()
    if any(w in text for w in ("exercise", "walk", "movement", "fitness", "physical activity")):
        return "Exercise"
    if any(w in text for w in ("sleep", "insomnia", "rest", "circadian")):
        return "Sleep"
    if any(w in text for w in ("diet", "nutrition", "food", "mind diet", "omega")):
        return "Nutrition"
    if any(w in text for w in ("drug", "trial", "treatment", "therapy", "vaccine", "fda")):
        return "Research"
    if any(w in text for w in ("social", "loneliness", "community")):
        return "Social"
    if "heart" in text or "vascular" in text or "blood pressure" in text:
        return "Heart-brain"
    return "Brain health"


def _guess_deliverable(theme: str) -> PlanDeliverable:
    if theme == "Research":
        return PlanDeliverable.POST
    if theme in ("Exercise", "Nutrition", "Sleep"):
        return PlanDeliverable.STORY
    return PlanDeliverable.POST


def _suggested_hook(title: str, summary: str) -> str:
    snippet = summary[:180].rstrip() if summary else title
    return f"Trending now: {snippet} — here's the CPBH-friendly angle for our audience."


def _is_relevant(item: RawTrend, *, strict: bool) -> bool:
    blob = f"{item.title} {item.summary}"
    pattern = STRICT_BRAIN_KEYWORDS if strict else BRAIN_KEYWORDS
    return bool(pattern.search(blob))


async def scan_brain_health_trends(*, limit: int = 12) -> tuple[list[dict], list[str]]:
    """Return trend dicts and list of sources that returned results."""
    collected: list[RawTrend] = []
    sources_ok: list[str] = []

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
        for source, url, strict in TREND_FEEDS:
            items = await _fetch_feed(client, source, url)
            if not items:
                continue
            sources_ok.append(source)
            for item in items:
                if _is_relevant(item, strict=strict):
                    collected.append(item)

    # Dedupe by title
    seen: set[str] = set()
    unique: list[RawTrend] = []
    for item in collected:
        key = item.title.lower().strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    unique.sort(key=lambda t: t.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    trimmed = unique[: max(limit, 1)]

    results = []
    for item in trimmed:
        theme = _guess_theme(item.title, item.summary)
        deliverable = _guess_deliverable(theme)
        results.append(
            {
                "id": _trend_id(item.title, item.url),
                "title": item.title,
                "url": item.url,
                "source": item.source,
                "summary": item.summary,
                "published_at": item.published_at.isoformat() if item.published_at else None,
                "theme": theme,
                "suggested_hook": _suggested_hook(item.title, item.summary),
                "deliverable": deliverable.value,
            }
        )
    return results, sources_ok
