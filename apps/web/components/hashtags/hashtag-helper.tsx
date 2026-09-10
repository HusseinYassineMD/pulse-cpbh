"use client";

import { useState } from "react";
import { Copy, Check, Hash, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { BRAND_HASHTAGS } from "@/lib/insights";
import { isStaticMode } from "@/lib/base-path";

type Props = {
  postId: string;
  caption?: string;
  onOptimized?: () => void;
};

export function HashtagHelper({ postId, caption, onOptimized }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([...BRAND_HASHTAGS.slice(0, 4)]);

  const optimize = useMutation({
    mutationFn: () => api.posts.optimizeCaptions(postId),
    onSuccess: (results) => {
      const tags = results.flatMap((r) => r.hashtags ?? []);
      if (tags.length) setPicked([...new Set(tags)]);
      onOptimized?.();
    },
  });

  const toggle = (tag: string) => {
    setPicked((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const copyAll = async () => {
    const block = picked.join(" ");
    await navigator.clipboard.writeText(block);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyWithCaption = async () => {
    const text = caption ? `${caption.trim()}\n\n${picked.join(" ")}` : picked.join(" ");
    await navigator.clipboard.writeText(text);
    setCopied("caption");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="pulse-card p-4 space-y-3 border border-border/80">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Hashtag toolkit</h3>
        </div>
        {!isStaticMode() && (
          <button
            type="button"
            onClick={() => optimize.mutate()}
            disabled={optimize.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {optimize.isPending ? "Optimizing…" : "AI suggest"}
          </button>
        )}
      </div>

      {optimize.isError && (
        <p className="text-xs text-red-600">
          {optimize.error instanceof ApiError ? optimize.error.message : "Could not optimize"}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {BRAND_HASHTAGS.map((tag) => {
          const active = picked.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-border hover:bg-secondary"
        >
          {copied === "all" ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
          Copy hashtags
        </button>
        {caption && (
          <button
            type="button"
            onClick={copyWithCaption}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-border hover:bg-secondary"
          >
            {copied === "caption" ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
            Copy caption + tags
          </button>
        )}
      </div>
    </div>
  );
}
