"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { AuthImage } from "@/components/auth-image";
import { InstagramPreview } from "@/components/posts/instagram-preview";
import type { MediaAsset, Post } from "@/lib/types";

type Platform = "instagram" | "facebook" | "linkedin";

type Props = {
  post: Post;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (index: number) => void;
};

const TABS: { id: Platform; label: string; icon: typeof Instagram }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
];

export function PlatformPreviews({ post, slides, slideIndex, onSlideChange }: Props) {
  const [platform, setPlatform] = useState<Platform>("instagram");

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Platform preview</p>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/40 text-xs flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlatform(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                platform === id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {platform === "instagram" ? (
        <InstagramPreview
          post={post}
          slides={slides}
          slideIndex={slideIndex}
          onSlideChange={onSlideChange}
        />
      ) : platform === "facebook" ? (
        <FacebookPreview post={post} slides={slides} slideIndex={slideIndex} onSlideChange={onSlideChange} />
      ) : (
        <LinkedInPreview post={post} slides={slides} slideIndex={slideIndex} onSlideChange={onSlideChange} />
      )}
    </div>
  );
}

function captionFor(post: Post, platform: Platform): string {
  return post.variants.find((v) => v.platform === platform)?.caption?.trim() || post.title;
}

function SlideImage({
  slides,
  slideIndex,
  onSlideChange,
  aspect = "square",
}: {
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (i: number) => void;
  aspect?: "square" | "wide";
}) {
  const current = slides[slideIndex];
  const aspectClass = aspect === "wide" ? "aspect-[1.91/1]" : "aspect-square";

  return (
    <div className={`relative ${aspectClass} bg-gray-100`}>
      {current?.url ? (
        <AuthImage src={current.url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
      )}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => onSlideChange(Math.max(0, slideIndex - 1))}
            disabled={slideIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSlideChange(Math.min(slides.length - 1, slideIndex + 1))}
            disabled={slideIndex >= slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium">
            {slideIndex + 1}/{slides.length}
          </div>
        </>
      )}
    </div>
  );
}

function FacebookPreview({
  post,
  slides,
  slideIndex,
  onSlideChange,
}: {
  post: Post;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (i: number) => void;
}) {
  const caption = captionFor(post, "facebook");

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <PageAvatar />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">USC CPBH</p>
            <p className="text-[11px] text-gray-500">Just now · 🌎</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-500 shrink-0" />
        </div>
        <p className="px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">{caption}</p>
        <SlideImage slides={slides} slideIndex={slideIndex} onSlideChange={onSlideChange} aspect="wide" />
        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>👍 124 · 💬 18 · ↗ 9</span>
        </div>
        <div className="grid grid-cols-3 border-t border-gray-100 text-sm text-gray-600">
          <button type="button" className="flex items-center justify-center gap-2 py-2.5 hover:bg-gray-50">
            <ThumbsUp className="w-4 h-4" /> Like
          </button>
          <button type="button" className="flex items-center justify-center gap-2 py-2.5 hover:bg-gray-50 border-x border-gray-100">
            <MessageCircle className="w-4 h-4" /> Comment
          </button>
          <button type="button" className="flex items-center justify-center gap-2 py-2.5 hover:bg-gray-50">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({
  post,
  slides,
  slideIndex,
  onSlideChange,
}: {
  post: Post;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (i: number) => void;
}) {
  const caption = captionFor(post, "linkedin");

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="flex items-start gap-2 px-3 py-3">
          <PageAvatar />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">USC Center for Personalized Brain Health</p>
            <p className="text-[11px] text-gray-500">12,482 followers · 1h</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-500 shrink-0" />
        </div>
        <p className="px-3 pb-3 text-sm leading-relaxed whitespace-pre-wrap line-clamp-8">{caption}</p>
        <SlideImage slides={slides} slideIndex={slideIndex} onSlideChange={onSlideChange} aspect="wide" />
        <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">847 reactions · 32 comments</div>
        <div className="grid grid-cols-4 border-t border-gray-100 text-xs text-gray-600">
          {["Like", "Comment", "Repost", "Send"].map((label) => (
            <button key={label} type="button" className="py-2.5 hover:bg-gray-50 font-medium">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageAvatar() {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}
    >
      <Sparkles className="w-5 h-5 text-white" />
    </div>
  );
}
