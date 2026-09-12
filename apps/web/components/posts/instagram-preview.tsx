"use client";

import { useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
} from "lucide-react";
import { AuthImage } from "@/components/auth-image";
import type { MediaAsset, Post } from "@/lib/types";

const HANDLE = "@uscpersonalizedbrain";

type Format = "carousel" | "story";

type Props = {
  post: Post;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (index: number) => void;
  caption?: string;
};

export function InstagramPreview({ post, slides, slideIndex, onSlideChange, caption }: Props) {
  const [format, setFormat] = useState<Format>("carousel");
  const current = slides[slideIndex];
  const igCaption = caption || post.variants.find((v) => v.platform === "instagram")?.caption || post.title;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instagram preview</p>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/40 text-xs">
          <button
            type="button"
            onClick={() => setFormat("carousel")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              format === "carousel" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Feed · 1:1
          </button>
          <button
            type="button"
            onClick={() => setFormat("story")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              format === "story" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Story · 9:16
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[320px]">
        <div className="rounded-[2rem] border-[4px] border-gray-900/90 bg-gray-900 shadow-2xl overflow-hidden">
          <div className="h-5 bg-gray-900 flex items-center justify-center">
            <div className="w-16 h-1 rounded-full bg-gray-700" />
          </div>

          {format === "carousel" ? (
            <FeedMock
              current={current}
              slides={slides}
              slideIndex={slideIndex}
              onSlideChange={onSlideChange}
              caption={igCaption}
            />
          ) : (
            <StoryMock
              current={current}
              slides={slides}
              slideIndex={slideIndex}
              onSlideChange={onSlideChange}
              caption={igCaption}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-teal/30"
      style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}
    >
      <Sparkles className="w-4 h-4 text-white" />
    </div>
  );
}

function FeedMock({
  current,
  slides,
  slideIndex,
  onSlideChange,
  caption,
}: {
  current?: MediaAsset;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (i: number) => void;
  caption: string;
}) {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <ProfileAvatar />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{HANDLE}</p>
          <p className="text-[10px] text-gray-400">USC CPBH</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-600 shrink-0" />
      </div>

      <div className="relative aspect-square bg-gray-100">
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

      {slides.length > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSlideChange(i)}
              aria-label={`Slide ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === slideIndex ? "bg-teal scale-125" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-gray-800">
          <Heart className="w-6 h-6" />
          <MessageCircle className="w-6 h-6" />
          <Send className="w-6 h-6" />
        </div>
        <Bookmark className="w-6 h-6 text-gray-800" />
      </div>

      <div className="px-3 pb-3 space-y-1">
        <p className="text-xs font-semibold">842 likes</p>
        <p className="text-xs leading-relaxed">
          <span className="font-semibold mr-1">{HANDLE}</span>
          <span className="text-gray-800 whitespace-pre-wrap line-clamp-4">{caption}</span>
        </p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Just now</p>
      </div>
    </div>
  );
}

function StoryMock({
  current,
  slides,
  slideIndex,
  onSlideChange,
  caption,
}: {
  current?: MediaAsset;
  slides: MediaAsset[];
  slideIndex: number;
  onSlideChange: (i: number) => void;
  caption: string;
}) {
  return (
    <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
      {current?.url ? (
        <AuthImage src={current.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-teal/30 to-gray-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

      <div className="absolute top-0 inset-x-0 z-10 px-2 pt-2 space-y-2">
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  i < slideIndex ? "w-full" : i === slideIndex ? "w-1/2" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-1">
          <ProfileAvatar />
          <span className="text-white text-xs font-semibold drop-shadow">{HANDLE}</span>
          <span className="text-white/70 text-[10px]">2h</span>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => onSlideChange(Math.max(0, slideIndex - 1))}
            disabled={slideIndex === 0}
            className="absolute left-0 top-12 bottom-12 w-1/3 z-10 disabled:cursor-default"
            aria-label="Previous story"
          />
          <button
            type="button"
            onClick={() => onSlideChange(Math.min(slides.length - 1, slideIndex + 1))}
            disabled={slideIndex >= slides.length - 1}
            className="absolute right-0 top-12 bottom-12 w-1/3 z-10 disabled:cursor-default"
            aria-label="Next story"
          />
        </>
      )}

      <div className="absolute bottom-0 inset-x-0 z-10 p-4 space-y-2">
        <p className="text-white text-sm font-medium drop-shadow line-clamp-3">{caption}</p>
        <div className="flex items-center gap-2 rounded-full border border-white/40 px-3 py-2">
          <span className="text-white/60 text-xs flex-1">Send message</span>
          <Heart className="w-5 h-5 text-white" />
          <Send className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
