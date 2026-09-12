"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Undo2,
  Trash2,
  Pencil,
  ShieldCheck,
  Send,
  LayoutGrid,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { SchedulePanel } from "@/components/schedule-panel";
import { HashtagHelper } from "@/components/hashtags/hashtag-helper";
import { PostWorkflowBanner } from "@/components/posts/post-workflow-banner";
import { ContentChat } from "@/components/studio/content-chat";
import { PublishAttempts } from "@/components/posts/publish-attempts";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformLabel } from "@/components/ui/platform-badges";
import { PageBackLink, PageError, PageSkeleton } from "@/components/ui/page-chrome";
import { InstagramPreview } from "@/components/posts/instagram-preview";
import { celebrate } from "@/lib/celebrate";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [slideIndex, setSlideIndex] = useState(0);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [compliance, setCompliance] = useState<{ passed: boolean; issues: string[]; suggestions: string[] } | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mediaView, setMediaView] = useState<"editor" | "preview">("editor");

  const { data: post, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.posts.get(id),
    enabled: !!id,
    retry: 1,
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

  const saveTitle = useMutation({
    mutationFn: (title: string) => api.posts.update(id, { title }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setEditingTitle(false);
      setInfoMsg("Title updated");
      setTimeout(() => setInfoMsg(""), 3000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save title"),
  });

  const submitReview = useMutation({
    mutationFn: () => api.posts.submitReview(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setInfoMsg("Submitted for review");
      setTimeout(() => setInfoMsg(""), 4000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not submit"),
  });

  const approve = useMutation({
    mutationFn: () => api.posts.approve(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      celebrate();
      setInfoMsg("Approved — ready to schedule!");
      setTimeout(() => setInfoMsg(""), 5000);
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

  const checkCompliance = useMutation({
    mutationFn: () => api.posts.reviewCompliance(id),
    onSuccess: (result) => {
      setCompliance(result);
      setInfoMsg(result.passed ? "Compliance check passed" : "Review compliance suggestions below");
      setTimeout(() => setInfoMsg(""), 5000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Compliance check failed"),
  });

  const saveCaption = useMutation({
    mutationFn: ({ platform, caption }: { platform: string; caption: string }) =>
      api.posts.updateVariant(id, platform, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      setEditingPlatform(null);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/board");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not delete post"),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageBackLink />
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    const message =
      loadError instanceof ApiError
        ? loadError.message
        : "Could not load this post. Check your connection and try again.";
    return (
      <div className="max-w-3xl">
        <PageError message={message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl">
        <PageError message="This post was not found — it may have been deleted." backLabel="Back to board" />
      </div>
    );
  }

  const slides = post.media_assets;
  const currentSlide = slides[slideIndex];
  const canGenerate = post.status === "draft" && post.post_creator_id;
  const isGenerating = post.status === "generating";
  const hasContent = slides.length > 0;
  const canSubmitReview = post.status === "ready";
  const canApprove = ["ready", "in_review"].includes(post.status);
  const canUnapprove = post.status === "approved";
  const canSchedule = post.variants.length > 0 && !["draft", "generating"].includes(post.status);
  const availablePlatforms = post.variants.map((v) => v.platform);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" />
        Back to board
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-border text-lg font-bold"
                autoFocus
              />
              <button
                type="button"
                onClick={() => saveTitle.mutate(editTitle.trim())}
                disabled={!editTitle.trim() || saveTitle.isPending}
                className="px-3 py-2 btn-primary text-sm rounded-lg disabled:opacity-50"
              >
                Save
              </button>
              <button type="button" onClick={() => setEditingTitle(false)} className="px-3 py-2 text-sm text-muted-foreground">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold break-words">{post.title}</h1>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(post.title);
                  setEditingTitle(true);
                }}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                aria-label="Edit title"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <StatusBadge status={post.status} />
            </div>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {format(new Date(post.created_at), "MMMM d, yyyy")}
            {post.media_assets.length > 0 && ` · ${post.media_assets.length} slide${post.media_assets.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          {canGenerate && (
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] btn-primary text-sm disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4" />
              {generate.isPending || isGenerating ? "Generating..." : "Generate"}
            </button>
          )}
          {canSubmitReview && (
            <button
              onClick={() => submitReview.mutate()}
              disabled={submitReview.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Send className="w-4 h-4" />
              Submit review
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
          )}
          {canUnapprove && (
            <button
              onClick={() => unapprove.mutate()}
              disabled={unapprove.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-border bg-background text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Undo2 className="w-4 h-4" />
              {unapprove.isPending ? "Updating..." : "Unapprove"}
            </button>
          )}
          {post.variants.length > 0 && (
            <button
              onClick={() => checkCompliance.mutate()}
              disabled={checkCompliance.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 flex-1 sm:flex-none"
            >
              <ShieldCheck className="w-4 h-4" />
              {checkCompliance.isPending ? "Checking…" : "Compliance"}
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex-1 sm:flex-none"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="pulse-card p-5 border border-red-200 bg-red-50/50 space-y-3">
          <p className="text-sm font-medium">Delete this post permanently?</p>
          <p className="text-sm text-muted-foreground">
            Slides, captions, and schedule entries for this post will be removed.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-lg text-sm border border-border bg-background hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {remove.isPending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}

      <PostWorkflowBanner
        post={post}
        onMessage={(msg) => {
          setInfoMsg(msg);
          setTimeout(() => setInfoMsg(""), 5000);
        }}
      />

      {infoMsg && (
        <div className="p-3 bg-teal/10 text-teal-900 border border-teal/25 rounded-lg text-sm">{infoMsg}</div>
      )}

      {compliance && !compliance.passed && (
        <div className="pulse-card p-4 border border-amber-200 bg-amber-50/80 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Compliance suggestions</p>
          <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
            {compliance.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          {compliance.suggestions.length > 0 && (
            <p className="text-xs text-amber-800">{compliance.suggestions.join(" · ")}</p>
          )}
        </div>
      )}

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {canGenerate && !hasContent && !generate.isPending && (
        <div className="pulse-card p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-muted-foreground">Hit Generate to create carousel slides and captions.</p>
        </div>
      )}

      {hasContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm">Media</h2>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/40 text-xs">
              <button
                type="button"
                onClick={() => setMediaView("editor")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  mediaView === "editor" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMediaView("preview")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  mediaView === "preview" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Instagram
              </button>
            </div>
          </div>

          {mediaView === "preview" ? (
            <InstagramPreview
              post={post}
              slides={slides}
              slideIndex={slideIndex}
              onSlideChange={setSlideIndex}
            />
          ) : (
            <div className="pulse-card overflow-hidden max-w-md">
              <div className="relative bg-gray-50 aspect-square">
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
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-500">
                    {slideIndex + 1} / {slides.length}
                  </span>
                  <button
                    onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                    disabled={slideIndex >= slides.length - 1}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {post.variants.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
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
                      <button onClick={() => setEditingPlatform(null)} className="px-3 py-1 text-sm text-gray-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.caption}</p>
                )}
              </div>
            ))}
            <HashtagHelper
              postId={id}
              caption={post.variants[0]?.caption}
              onOptimized={() => queryClient.invalidateQueries({ queryKey: ["post", id] })}
            />
          </div>

          <ContentChat
            postId={id}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["post", id] })}
          />
        </div>
      )}

      <PublishAttempts postId={id} />

      {canSchedule && (
        <div id="schedule">
          <SchedulePanel
            postId={id}
            availablePlatforms={availablePlatforms}
            onScheduled={() => {
              queryClient.invalidateQueries({ queryKey: ["post", id] });
              queryClient.invalidateQueries({ queryKey: ["posts"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              queryClient.invalidateQueries({ queryKey: ["schedule"] });
              queryClient.invalidateQueries({ queryKey: ["publish-attempts", id] });
              setInfoMsg("Scheduled — it will show on your calendar.");
              setTimeout(() => setInfoMsg(""), 5000);
            }}
          />
        </div>
      )}
    </div>
  );
}
