"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Check, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { SchedulePanel } from "@/components/schedule-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformLabel } from "@/components/ui/platform-badges";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [slideIndex, setSlideIndex] = useState(0);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [error, setError] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.posts.get(id),
    enabled: !!id,
  });

  const generate = useMutation({
    mutationFn: () => api.posts.generate(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSlideIndex(0);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Generation failed"),
  });

  const approve = useMutation({
    mutationFn: () => api.posts.approve(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const unapprove = useMutation({
    mutationFn: () => api.posts.unapprove(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not unapprove"),
  });

  const saveCaption = useMutation({
    mutationFn: ({ platform, caption }: { platform: string; caption: string }) =>
      api.posts.updateVariant(id, platform, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      setEditingPlatform(null);
    },
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!post) return <p className="text-red-600">Post not found.</p>;

  const isStory = post.source_config?.type === "story";
  const slides = post.media_assets;
  const currentSlide = slides[slideIndex];
  const canGenerate = post.status === "draft" && post.post_creator_id;
  const isGenerating = post.status === "generating";
  const hasContent = slides.length > 0;
  const canApprove = ["ready", "in_review"].includes(post.status);
  const canUnapprove = post.status === "approved";
  const canSchedule = post.variants.length > 0 && !["draft", "generating"].includes(post.status);
  const availablePlatforms = post.variants.map((v) => v.platform);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <StatusBadge status={post.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {format(new Date(post.created_at), "MMMM d, yyyy")}
            {post.media_assets.length > 0 && ` · ${post.media_assets.length} slide${post.media_assets.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex gap-2">
          {canGenerate && (
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 btn-primary text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generate.isPending || isGenerating ? "Generating..." : "Generate"}
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
          )}
          {canUnapprove && (
            <button
              onClick={() => unapprove.mutate()}
              disabled={unapprove.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Undo2 className="w-4 h-4" />
              {unapprove.isPending ? "Updating..." : "Unapprove"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {canGenerate && !hasContent && !generate.isPending && (
        <div className="pulse-card p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-muted-foreground">Hit Generate to create carousel slides and captions.</p>
        </div>
      )}

      {hasContent && (
        <div className={`pulse-card overflow-hidden ${isStory ? "max-w-xs" : "max-w-md"}`}>
          <div className={`relative bg-gray-50 ${isStory ? "aspect-[9/16]" : "aspect-square"}`}>
            {currentSlide?.url && (
              <AuthImage
                src={currentSlide.url}
                alt={`Slide ${slideIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          {slides.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <button
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                disabled={slideIndex === 0}
                className="p-1 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-500">
                {slideIndex + 1} / {slides.length}
              </span>
              <button
                onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={slideIndex === slides.length - 1}
                className="p-1 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {post.variants.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Captions</h2>
          {post.variants.map((v) => (
            <div key={v.id} className="pulse-card p-4">
              <div className="flex items-center justify-between mb-2">
                <PlatformLabel platform={v.platform} />
                {editingPlatform !== v.platform && (
                  <button
                    onClick={() => {
                      setEditingPlatform(v.platform);
                      setEditCaption(v.caption);
                    }}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingPlatform === v.platform ? (
                <div className="space-y-2">
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCaption.mutate({ platform: v.platform, caption: editCaption })}
                      className="px-3 py-1 btn-primary text-sm rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPlatform(null)}
                      className="px-3 py-1 text-sm text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {canSchedule && (
        <SchedulePanel
          postId={id}
          availablePlatforms={availablePlatforms}
          onScheduled={() => queryClient.invalidateQueries({ queryKey: ["post", id] })}
        />
      )}
    </div>
  );
}
