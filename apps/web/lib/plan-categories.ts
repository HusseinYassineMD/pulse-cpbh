import { CATEGORY_SUGGESTIONS } from "./plan-team";

const STORAGE_KEY = "pulse-learned-categories";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

function writeStore(values: string[]) {
  if (typeof window === "undefined") return;
  const unique = [...new Set(values.map(normalize).filter(Boolean))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

/** All known categories: defaults + learned, most recently used first among learned. */
export function getAllCategories(): string[] {
  const learned = readStore();
  const merged = [...learned];
  for (const seed of CATEGORY_SUGGESTIONS) {
    if (!merged.some((v) => v.toLowerCase() === seed.toLowerCase())) {
      merged.push(seed);
    }
  }
  return merged;
}

/** Remember a category after the user saves an idea. */
export function rememberCategory(value: string | null | undefined) {
  const normalized = normalize(value ?? "");
  if (!normalized) return;
  const learned = readStore().filter((v) => v.toLowerCase() !== normalized.toLowerCase());
  writeStore([normalized, ...learned]);
}

/** Pull categories from existing plan ideas into the learned store. */
export function seedCategoriesFromIdeas(themes: (string | null | undefined)[]) {
  const learned = readStore();
  const seen = new Set(learned.map((v) => v.toLowerCase()));
  const additions: string[] = [];
  for (const theme of themes) {
    const normalized = normalize(theme ?? "");
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      additions.push(normalized);
    }
  }
  if (additions.length) writeStore([...learned, ...additions]);
}

/** Suggest matches while typing — prefix matches first, then contains. */
export function suggestCategories(query: string, limit = 8): string[] {
  const options = getAllCategories();
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);

  const starts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const lower = option.toLowerCase();
    if (lower.startsWith(q)) starts.push(option);
    else if (lower.includes(q)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}
