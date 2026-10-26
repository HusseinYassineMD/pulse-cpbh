import { curatedTrendsResponse } from "./curated-trends";
import {
  buildTrendRotationPool,
  composeTrendList,
  TREND_ROTATION_POOL_SIZE,
} from "./trend-list-compose";
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

const CACHE_KEY = "pulse-trends-cache-v4-pool16";
const CACHE_TTL_MS = 20 * 60 * 1000;
const FEED_TIMEOUT_MS = 9000;
const FEED_TIMEOUT_FAST_MS = 3500;

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

const TREND_CANDIDATE_POOL = 80;

async function mapRawTrendPool(raw: RawTrend[]): Promise<TrendItem[]> {
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

  const slice = unique.slice(0, TREND_CANDIDATE_POOL);
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

async function displayFromLiveRaw(
  collected: RawTrend[],
  displayLimit: number,
  shuffleTail: boolean,
  snapshot: TrendScanResponse | null,
  liveSources: string[]
): Promise<TrendScanResponse> {
  const mapped = await mapRawTrendPool(collected);
  const extras = [
    ...(snapshot?.items ?? []),
    ...curatedTrendsResponse(TREND_ROTATION_POOL_SIZE).items,
  ];
  const pool = buildTrendRotationPool(mapped, extras, TREND_ROTATION_POOL_SIZE);
  const items = composeTrendList(pool, displayLimit, { shuffleTail });
  let sources_checked = liveSources;
  if (mapped.length === 0 && snapshot?.items.length) {
    sources_checked = snapshot.sources_checked;
  } else if (mapped.length === 0) {
    sources_checked = ["CPBH curated"];
  }
  return {
    scanned_at: new Date().toISOString(),
    sources_checked,
    items,
  };
}

export function clearTrendsCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Synchronous starter list — cache or curated — so the UI is never empty while RSS runs. */
export function getInstantTrendsPreview(limit = 16): TrendScanResponse {
  return readTrendsCache() ?? curatedTrendsResponse(limit);
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

async function fetchFeed(source: string, rssUrl: string, timeoutMs = FEED_TIMEOUT_MS): Promise<RawTrend[]> {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeoutMs) });
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
  onProgress?: (progress: TrendScanProgress) => void,
  options?: {
    feeds?: typeof TREND_FEEDS;
    timeoutMs?: number;
    shuffleTail?: boolean;
  }
): Promise<{ mapped: TrendItem[]; sources: string[]; collected: RawTrend[] }> {
  const feedList = options?.feeds ?? TREND_FEEDS;
  const timeoutMs = options?.timeoutMs ?? FEED_TIMEOUT_MS;
  const collected: RawTrend[] = [];
  const sourcesOk: string[] = [];
  let feedsDone = 0;
  const feedsTotal = feedList.length;

  const emit = async () => {
    if (!onProgress) return;
    const partial = await displayFromLiveRaw(
      collected,
      limit,
      false,
      null,
      [...sourcesOk]
    );
    onProgress({
      items: partial.items,
      sources_checked: partial.sources_checked,
      feeds_done: feedsDone,
      feeds_total: feedsTotal,
    });
  };

  await Promise.all(
    feedList.map(async ({ source, url, strict }) => {
      try {
        const items = await fetchFeed(source, url, timeoutMs);
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

  const mapped = await mapRawTrendPool(collected);
  return { mapped, sources: sourcesOk, collected };
}

async function loadBuildSnapshot(): Promise<TrendScanResponse | null> {
  try {
    const res = await fetch(withBasePath("/data/trends-snapshot.json"), {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TrendScanResponse;
    return data.items?.length ? data : null;
  } catch {
    return null;
  }
}


/** Live RSS scan from the browser — works on GitHub Pages (no backend required). */
export async function scanBrainHealthTrends(
  limit = 16,
  options?: {
    force?: boolean;
    fast?: boolean;
    /** Run live feeds even when session cache is warm (does not clear cache first). */
    bypassCache?: boolean;
    onProgress?: (progress: TrendScanProgress) => void;
  }
): Promise<TrendScanResponse> {
  const force = options?.force === true;
  const fast = options?.fast === true;
  const bypassCache = options?.bypassCache === true;

  if (!force && !bypassCache) {
    const cached = readTrendsCache();
    if (cached?.items.length) return cached;
  } else if (force) {
    clearTrendsCache();
  }

  if (scanInFlight && !force && !bypassCache) {
    return scanInFlight;
  }
  if (force || bypassCache) {
    scanInFlight = null;
  }

  const run = async (): Promise<TrendScanResponse> => {
    const shuffleTail = force;
    const feedOpts = fast
      ? {
          feeds: TREND_FEEDS.slice(0, 2),
          timeoutMs: FEED_TIMEOUT_FAST_MS,
          shuffleTail,
        }
      : { shuffleTail };
    const { collected, sources } = await fetchAllFeeds(limit, options?.onProgress, feedOpts);
    const snapshot = await loadBuildSnapshot();
    const result = await displayFromLiveRaw(
      collected,
      limit,
      shuffleTail,
      snapshot,
      sources
    );

    writeTrendsCache(result);
    return result;
  };

  scanInFlight = run().finally(() => {
    scanInFlight = null;
  });

  return scanInFlight;
}
