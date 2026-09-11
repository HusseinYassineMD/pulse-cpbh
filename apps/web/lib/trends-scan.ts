import { withBasePath } from "./base-path";
import type { PlanDeliverable } from "./types";
import type { TrendItem, TrendScanResponse } from "./trends-types";

type RawTrend = {
  title: string;
  url: string;
  source: string;
  summary: string;
  published_at: string | null;
};

/** Matches backend `apps/api/app/services/trends.py` — all four public RSS sources. */
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

const CACHE_KEY = "pulse-trends-cache-v2";
const CACHE_TTL_MS = 20 * 60 * 1000;
const FEED_TIMEOUT_MS = 9000;

const BRAIN_KEYWORDS =
  /\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|tau|parkinson|stroke|mental\s+health|sleep|exercise|nutrition|mind|aging|prevention|glymphatic)\b/i;

const STRICT_BRAIN_KEYWORDS =
  /\b(brain|alzheimer|dementia|cognitive|memory|neuro|apoe|amyloid|tau|parkinson|stroke|glymphatic|neurolog)\b/i;

let scanInFlight: Promise<TrendScanResponse> | null = null;

export type TrendScanProgress = {
  items: TrendItem[];
  sources_checked: string[];
  feeds_done: number;
  feeds_total: number;
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
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

async function rawToTrendItems(raw: RawTrend[], limit: number): Promise<TrendItem[]> {
  const seen = new Set<string>();
  const unique: RawTrend[] = [];
  for (const item of raw) {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });

  const slice = unique.slice(0, Math.max(limit, 1));
  return Promise.all(
    slice.map(async (item) => {
      const theme = guessTheme(item.title, item.summary);
      return {
        id: await sha256Hex(`${item.title}|${item.url}`),
        title: item.title,
        url: item.url,
        source: item.source,
        summary: item.summary,
        published_at: item.published_at,
        theme,
        suggested_hook: suggestedHook(item.title, item.summary),
        deliverable: guessDeliverable(theme),
      };
    })
  );
}

export function readTrendsCache(): TrendScanResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: TrendScanResponse };
    if (Date.now() - savedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeTrendsCache(data: TrendScanResponse): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota — ignore */
  }
}

async function fetchFeed(source: string, rssUrl: string): Promise<RawTrend[]> {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    status?: string;
    message?: string;
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

/** Fetch every configured source in parallel — same coverage as the Python API. */
async function fetchAllFeeds(
  limit: number,
  onProgress?: (progress: TrendScanProgress) => void
): Promise<{ items: TrendItem[]; sources: string[] }> {
  const collected: RawTrend[] = [];
  const sourcesOk: string[] = [];
  let feedsDone = 0;
  const feedsTotal = TREND_FEEDS.length;

  const emit = async () => {
    if (!onProgress) return;
    onProgress({
      items: await rawToTrendItems(collected, limit),
      sources_checked: [...sourcesOk],
      feeds_done: feedsDone,
      feeds_total: feedsTotal,
    });
  };

  await Promise.all(
    TREND_FEEDS.map(async ({ source, url, strict }) => {
      try {
        const items = await fetchFeed(source, url);
        if (items.length) {
          sourcesOk.push(source);
          for (const item of items) {
            if (isRelevant(item, strict)) collected.push(item);
          }
        }
      } catch {
        /* timeout — other feeds may still succeed */
      } finally {
        feedsDone += 1;
        await emit();
      }
    })
  );

  const items = await rawToTrendItems(collected, limit);
  return { items, sources: sourcesOk };
}

async function loadBuildSnapshot(): Promise<TrendScanResponse | null> {
  try {
    const res = await fetch(withBasePath("/data/trends-snapshot.json"), {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TrendScanResponse;
    return data.items?.length ? data : null;
  } catch {
    return null;
  }
}

function mergeTrendResults(
  live: TrendScanResponse,
  snapshot: TrendScanResponse,
  limit: number
): TrendScanResponse {
  const seen = new Set(live.items.map((i) => i.title.toLowerCase().trim()));
  const merged = [...live.items];
  for (const item of snapshot.items) {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  merged.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
  const sources = Array.from(new Set([...live.sources_checked, ...snapshot.sources_checked]));
  return {
    scanned_at: live.scanned_at,
    sources_checked: sources,
    items: merged.slice(0, limit),
  };
}

/** Live RSS scan from the browser — works on GitHub Pages (no backend required). */
export async function scanBrainHealthTrends(
  limit = 16,
  options?: { force?: boolean; onProgress?: (progress: TrendScanProgress) => void }
): Promise<TrendScanResponse> {
  if (!options?.force) {
    const cached = readTrendsCache();
    if (cached?.items.length) return cached;
  }

  if (scanInFlight && !options?.force) {
    return scanInFlight;
  }

  const run = async (): Promise<TrendScanResponse> => {
    const { items, sources } = await fetchAllFeeds(limit, options?.onProgress);

    let result: TrendScanResponse = {
      scanned_at: new Date().toISOString(),
      sources_checked: sources,
      items,
    };

    const snapshot = await loadBuildSnapshot();

    if (!items.length && snapshot) {
      result = {
        scanned_at: new Date().toISOString(),
        sources_checked: snapshot.sources_checked,
        items: snapshot.items.slice(0, limit),
      };
    } else if (items.length > 0 && snapshot && items.length < limit) {
      result = mergeTrendResults(result, snapshot, limit);
    }

    if (!result.items.length) {
      throw new Error(
        "Could not reach trend sources (Google News, BBC Health, MedlinePlus). Wait a moment and tap Scan again."
      );
    }

    writeTrendsCache(result);
    return result;
  };

  scanInFlight = run().finally(() => {
    scanInFlight = null;
  });

  return scanInFlight;
}
