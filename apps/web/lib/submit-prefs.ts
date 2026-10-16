const KEY = "pulse-submit-name";

export function readSubmitName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function writeSubmitName(name: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, name.trim());
  } catch {
    /* ignore */
  }
}
