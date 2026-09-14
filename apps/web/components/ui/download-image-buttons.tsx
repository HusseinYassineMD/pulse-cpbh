"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { downloadImage, downloadImages, filenameFromSrc, safeBaseName } from "@/lib/download-media";

type Item = {
  url: string | null | undefined;
  s3_key?: string;
};

type Props = {
  items: Item[];
  activeIndex?: number;
  baseName: string;
  className?: string;
};

export function DownloadImageButtons({ items, activeIndex = 0, baseName, className = "" }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [busy, setBusy] = useState<"one" | "all" | null>(null);
  const [error, setError] = useState("");

  const withUrls = items
    .map((item, index) => {
      if (!item.url) return null;
      const ext = filenameFromSrc(item.url, `slide-${String(index + 1).padStart(2, "0")}.png`).split(".").pop();
      const filename = item.s3_key || `${safeBaseName(baseName)}-${String(index + 1).padStart(2, "0")}.${ext ?? "png"}`;
      return { url: item.url, filename };
    })
    .filter(Boolean) as { url: string; filename: string }[];

  if (withUrls.length === 0) return null;

  const current = withUrls[activeIndex] ?? withUrls[0];

  async function downloadCurrent() {
    setError("");
    setBusy("one");
    try {
      await downloadImage(current.url, current.filename, token);
    } catch {
      setError("Download failed — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    setError("");
    setBusy("all");
    try {
      await downloadImages(withUrls, token);
    } catch {
      setError("Download failed — try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={downloadCurrent}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-border bg-white hover:bg-secondary disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        {busy === "one" ? "Downloading…" : "Download image"}
      </button>
      {withUrls.length > 1 && (
        <button
          type="button"
          onClick={downloadAll}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-teal/30 bg-teal/10 text-teal hover:bg-teal/15 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {busy === "all" ? "Downloading…" : `Download all (${withUrls.length})`}
        </button>
      )}
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </div>
  );
}
