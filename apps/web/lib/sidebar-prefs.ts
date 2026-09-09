const STORAGE_KEY = "pulse-sidebar";

export function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "closed";
}

export function writeSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
}
