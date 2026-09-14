import { isStaticMode, withBasePath } from "@/lib/base-path";

function isLocalDev(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function localApiOrigin(): string {
  const port = process.env.NEXT_PUBLIC_PULSE_API_PORT || "8010";
  return `http://127.0.0.1:${port}`;
}

export function resolveMediaUrl(src: string): string {
  const staticMode = isStaticMode();
  let normalized = src;
  if (staticMode) {
    normalized = src.replace(/^\/api\/media/, "/media");
  } else if (normalized.startsWith("/api/v1/media")) {
    normalized = normalized.replace(/^\/api\/v1\/media/, "/api/media");
  }
  return withBasePath(normalized);
}

export async function fetchImageBlob(src: string, token?: string | null): Promise<Blob> {
  const resolved = resolveMediaUrl(src);
  const headers: Record<string, string> = {};
  if (token && !isStaticMode()) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(resolved, { headers, credentials: "same-origin" });
  if (!response.ok && isLocalDev() && resolved.startsWith("/")) {
    const direct = `${localApiOrigin()}${resolved.replace(/^\/api/, "/api/v1")}`;
    response = await fetch(direct, { headers });
  }
  if (!response.ok) throw new Error(`Could not fetch image (${response.status})`);
  return response.blob();
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

export function filenameFromSrc(src: string, fallback: string): string {
  const part = src.split("/").pop();
  if (part && /\.[a-z0-9]+$/i.test(part)) return part;
  return fallback;
}

export function safeBaseName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "pulse-image";
}

export async function downloadImage(src: string, filename: string, token?: string | null) {
  const blob = await fetchImageBlob(src, token);
  triggerBlobDownload(blob, filename);
}

export async function downloadImages(
  items: { url: string; filename: string }[],
  token?: string | null,
  onProgress?: (done: number, total: number) => void
) {
  const blobs: Blob[] = [];
  for (let i = 0; i < items.length; i += 1) {
    blobs.push(await fetchImageBlob(items[i].url, token));
    onProgress?.(i + 1, items.length);
  }
  for (let i = 0; i < blobs.length; i += 1) {
    triggerBlobDownload(blobs[i], items[i].filename);
  }
}
