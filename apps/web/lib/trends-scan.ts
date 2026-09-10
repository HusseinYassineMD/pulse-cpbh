import type { PlanDeliverable } from "./types";
import type { TrendItem, TrendScanResponse } from "./trends-types";

type RawTrend = {
  title: string;
  url: string;
  source: string;
  summary: string;
  published_at: string | null;
};

const TREND_FEEDS: { source: string; url: string; strict: boolean }[] = [
  {
    source: "Google News",
    url: "https://news.google.com/rss/search?q=brain+health+OR+Alzheimer+prevention+OR+cognitive+decline&hl=en-US&gl=US&ceid=US:en",
    strict: false,
  },
  {
    source: "Google News · Research",
    url: "https://news.google.com/rss/search?q=cognitive+decline+prevention+research+study&hl=en-US&gl=US&ceid=US:en",
    strict: false,
  },
  {
    source: "BBC Health",
    url: "https://feeds.bbci.co.uk/news/health/rss.xml",
    strict: true,
  },
  {
    source: "MedlinePlus",
    url: "https://medlineplus.gov/groupfeeds/new.xml",
    strict: true,
  },
];

const BRAIN_KEYWORDS =
  /\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|tau|parkinson|stroke|mental\s+health|sleep|exercise|nutrition|mind|aging|prevention|glymphatic)\b/i;

const STRICT_BRAIN_KEYWORDS =
  /\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|tau|parkinson|stroke|glymphatic|neurolog)\b/i;

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function trendId(title: string, url: string): string {
  let hash = 0;
  const key = `${title}|${url}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16);
}

function guessTheme(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (/\b(exercise|walk|movement|fitness|physical activity)\b/.test(text)) return "Exercise";
  if (/\b(sleep|insomnia|rest|circadian)\b/.test(text)) return "Sleep";
  if (/\b(diet|nutrition|food|mind diet|omega)\b/.test(text)) return "Nutrition";
  if (/\b(drug|trial|treatment|therapy|vaccine|fda)\b/.test(text)) return "Research";
  if (/\b(social|loneliness|community)\b/.test(text)) return "Social";
  if (/\b(heart|vascular|blood pressure)\b/.test(text)) return "Heart-brain";
  return "Brain health";
}

function guessDeliverable(theme: string): PlanDeliverable {
  if (theme === "Research") return "post";
  if (theme === "Exercise" || theme === "Nutrition" || theme === "Sleep") return "story";
  return "post";
}

function suggestedHook(title: string, summary: string): string {
  const snippet = summary ? summary.slice(0, 180).trim() : title;
  return `Trending now: ${snippet} — here's the CPBH-friendly angle for our audience.`;
}

function isRelevant(item: RawTrend, strict: boolean): boolean {
  const blob = `${item.title} ${item.summary}`;
  return strict ? STRICT_BRAIN_KEYWORDS.test(blob) : BRAIN_KEYWORDS.test(blob);
}

async function fetchFeed(source: string, rssUrl: string): Promise<RawTrend[]> {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    status?: string;
    items?: { title?: string; link?: string; description?: string; pubDate?: string }[];
  };
  if (data.status !== "ok" || !data.items?.length) return [];

  return data.items
    .filter((item) => item.title && item.link)
    .map((item) => ({
      title: item.title!.trim(),
      url: item.link!.trim(),
      source,
      summary: stripHtml(item.description ?? "").slice(0, 400),
      published_at: item.pubDate ?? null,
    }));
}

/** Live RSS scan from the browser — works on GitHub Pages (no backend required). */
export async function scanBrainHealthTrends(limit = 12): Promise<TrendScanResponse> {
  const collected: RawTrend[] = [];
  const sourcesOk: string[] = [];

  await Promise.all(
    TREND_FEEDS.map(async ({ source, url, strict }) => {
      const items = await fetchFeed(source, url);
      if (!items.length) return;
      sourcesOk.push(source);
      for (const item of items) {
        if (isRelevant(item, strict)) collected.push(item);
      }
    })
  );

  const seen = new Set<string>();
  const unique = collected.filter((item) => {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });

  const items: TrendItem[] = unique.slice(0, Math.max(limit, 1)).map((item) => {
    const theme = guessTheme(item.title, item.summary);
    return {
      id: trendId(item.title, item.url),
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      published_at: item.published_at,
      theme,
      suggested_hook: suggestedHook(item.title, item.summary),
      deliverable: guessDeliverable(theme),
    };
  });

  if (!items.length) {
    throw new Error("No brain-health headlines found — try again in a moment.");
  }

  return {
    scanned_at: new Date().toISOString(),
    sources_checked: sourcesOk,
    items,
  };
}

export function demoTrendScanResponse(): TrendScanResponse {
  return {
    scanned_at: new Date().toISOString(),
    sources_checked: ["Sample data"],
    items: [
      {
        id: "demo-1",
        title: "New study links regular walking pace to lower dementia risk in older adults",
        url: "https://news.google.com/",
        source: "Google News",
        summary:
          "Researchers report that faster habitual walking may correlate with better cognitive outcomes — relevant for prevention messaging.",
        published_at: new Date().toISOString(),
        theme: "Exercise",
        suggested_hook:
          "Trending now: movement matters for brain aging — share what APOE4 carriers should know.",
        deliverable: "story",
      },
    ],
  };
}
