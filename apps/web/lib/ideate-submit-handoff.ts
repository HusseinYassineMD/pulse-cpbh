const STORAGE_KEY = "pulse-ideate-to-submit-v1";

export type IdeateSubmitHandoff = {
  topic: string;
  notes?: string;
  captions?: { instagram: string; facebook: string; linkedin: string };
};

export function saveIdeateDraftForSubmit(payload: IdeateSubmitHandoff): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota — submit page still works with manual paste */
  }
}

export function readIdeateDraftForSubmit(): IdeateSubmitHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as IdeateSubmitHandoff;
  } catch {
    return null;
  }
}
