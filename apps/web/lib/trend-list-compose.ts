import type { TrendItem } from "./trends-types";

/** Ideate sidebar — five headlines on screen at a time. */
export const IDEATE_HOT_TOPICS_COUNT = 5;

/** Live + curated pool we rotate through (the old “16 topics” catalog). */
export const TREND_ROTATION_POOL_SIZE = 16;

function sortByPublishedDesc(items: TrendItem[]): TrendItem[] {
  return [...items].sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
}

function dedupeByTitle(items: TrendItem[]): TrendItem[] {
  const seen = new Set<string>();
  const out: TrendItem[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function backfillToLimit(pick: TrendItem[], pool: TrendItem[], cap: number): TrendItem[] {
  if (pick.length >= cap) return pick.slice(0, cap);
  const seen = new Set(pick.map((i) => i.id));
  const out = [...pick];
  for (const item of pool) {
    if (out.length >= cap) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** First load: newest N from pool. Refresh: shuffle full pool and pick N (always try to fill N). */
export function composeTrendList(
  items: TrendItem[],
  limit: number,
  options?: { shuffleTail?: boolean }
): TrendItem[] {
  const cap = Math.max(limit, 1);
  const sorted = sortByPublishedDesc(dedupeByTitle(items));
  if (!options?.shuffleTail) {
    return backfillToLimit(sorted.slice(0, cap), sorted, cap);
  }

  const shuffled = [...sorted];
  shuffleInPlace(shuffled);
  return backfillToLimit(shuffled.slice(0, cap), sorted, cap);
}

/** Merge live, snapshot, and curated into one rotation pool (up to poolSize). */
export function buildTrendRotationPool(
  live: TrendItem[],
  extras: TrendItem[],
  poolSize: number
): TrendItem[] {
  const merged = sortByPublishedDesc(dedupeByTitle([...live, ...extras]));
  return merged.slice(0, Math.max(poolSize, IDEATE_HOT_TOPICS_COUNT));
}
