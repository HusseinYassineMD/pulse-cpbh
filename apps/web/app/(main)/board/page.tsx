"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  Layers,
  Link2,
  Pencil,
  Plus,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { ContentIdea, Post, Story } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VisibleContent } from "@/components/ui/visible-content";
import { isStaticMode } from "@/lib/base-path";
import {
  computeBoardMetrics,
  formatBoardDate,
  postBoardMeta,
  storyBoardMeta,
} from "@/lib/board-stats";
import { STATIC_DATA_VERSION } from "@/lib/static-config";
import { AuthImage } from "@/components/auth-image";
import { PostNextAction } from "@/components/posts/post-next-action";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { ACTIONABLE_STATUSES } from "@/lib/post-workflow";

type BoardTab = "all" | "posts" | "stories";

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-fade-in">
          <div className="h-24 pulse-card animate-pulse bg-gray-100 rounded-2xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pulse-card h-72 animate-pulse bg-gray-100 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <BoardContent />
    </Suspense>
  );
}

type DeleteTarget =
  | { kind: "post"; item: Post }
  | { kind: "story"; item: Story };

function BoardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const tabParam = searchParams.get("tab");
  const filterParam = searchParams.get("filter");
  const tab: BoardTab =
    tabParam === "posts" || tabParam === "stories" ? tabParam : "all";

  const { data: postsData, isLoading: postsLoading, isError: postsError } = useQuery({
    queryKey: isStaticMode() ? ["posts", STATIC_DATA_VERSION] : ["posts"],
    queryFn: () => api.posts.list({ limit: 50 }),
  });

  const { data: storiesData, isLoading: storiesLoading, isError: storiesError } = useQuery({
    queryKey: isStaticMode() ? ["stories", STATIC_DATA_VERSION] : ["stories"],
    queryFn: () => api.stories.list({ limit: 100 }),
  });

  const { data: planData } = useQuery({
    queryKey: ["plan"],
    queryFn: () => api.plan.list(),
    retry: 1,
  });

  const allPosts = postsData?.items ?? [];
  const posts = useMemo(() => {
    if (filterParam === "action") {
      return allPosts.filter((p) => ACTIONABLE_STATUSES.includes(p.status));
    }
    if (filterParam === "published") {
      return allPosts.filter((p) => ["published", "partially_published"].includes(p.status));
    }
    return allPosts;
  }, [allPosts, filterParam]);
  const stories = storiesData?.items ?? [];
  const planItems = planData?.items ?? [];
  const isLoading = postsLoading || storiesLoading;
  const apiOffline = postsError && storiesError;
  const showPosts = tab === "all" || tab === "posts";
  const showStories = tab === "all" || tab === "stories";
  const isEmpty = !isLoading && !apiOffline && allPosts.length === 0 && stories.length === 0 && !filterParam;

  const metrics = useMemo(
    () => computeBoardMetrics(allPosts, stories, planItems),
    [allPosts, stories, planItems]
  );

  const topCategories = metrics.categories.filter((c) => c.name !== "Uncategorized").slice(0, 6);

  const removePost = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setDeleteTarget(null);
      setDeleteError("");
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : "Could not delete post"),
  });

  const removeStory = useMutation({
    mutationFn: (id: string) => api.stories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTarget(null);
      setDeleteError("");
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : "Could not delete story"),
  });

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "post") removePost.mutate(deleteTarget.item.id);
    else removeStory.mutate(deleteTarget.item.id);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content board</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <LayoutGrid className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Board
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            All content is produced and maintained here — with source dates and category metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate post
          </Link>
          {!isStaticMode() && (
            <Link
              href="/stories/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
            >
              <Plus className="w-4 h-4" />
              Add story
            </Link>
          )}
        </div>
      </div>

      {apiOffline && (
        <div className="pulse-card p-4 border-amber-200 bg-amber-50 text-sm text-amber-900">
          API offline — run <code className="bg-white/80 px-1 rounded">./start.sh api</code> in a terminal, then refresh.
        </div>
      )}

      {!isLoading && !apiOffline && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Total content" value={metrics.totalContent} icon={LayoutGrid} />
            <MetricCard label="Posts" value={metrics.postCount} icon={Layers} />
            <MetricCard label="Stories" value={metrics.storyCount} icon={Smartphone} />
            <MetricCard label="Categories" value={metrics.categoryCount} icon={Tag} accent="primary" />
            <MetricCard
              label="Ready to publish"
              value={metrics.readyCount}
              icon={CheckCircle2}
              accent="teal"
              href="/board?tab=posts&filter=action"
            />
            <MetricCard label="With source date" value={metrics.withSourceDate} icon={CalendarDays} />
          </div>

          {topCategories.length > 0 && (
            <section className="pulse-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">By category</h2>
              </div>
              <div className="space-y-3">
                {topCategories.map((row) => {
                  const max = topCategories[0]?.total || 1;
                  const width = Math.max(8, Math.round((row.total / max) * 100));
                  return (
                    <div key={row.name}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 text-sm mb-1">
                        <span className="font-medium break-words">{row.name}</span>
                        <span className="text-muted-foreground tabular-nums text-xs sm:text-sm">
                          {row.total}
                          <span className="block sm:inline sm:ml-1.5 text-[11px]">
                            ({row.posts} posts · {row.stories} stories
                            {row.plan > 0 ? ` · ${row.plan} in plan` : ""})
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <TabLink active={tab === "all"} href="/board" label="All" count={allPosts.length + stories.length} />
        <TabLink active={tab === "posts"} href="/board?tab=posts" label="Posts" count={allPosts.length} />
        <TabLink active={tab === "stories"} href="/board?tab=stories" label="Stories" count={stories.length} />
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="pulse-card h-72 animate-pulse bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="pulse-card p-16 text-center">
          <LayoutGrid className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-muted-foreground mb-4">No content on the board yet</p>
          <Link href="/" className="text-primary hover:underline font-semibold">
            Generate from home →
          </Link>
        </div>
      )}

      {deleteError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{deleteError}</p>
      )}

      {actionMsg && (
        <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{actionMsg}</p>
      )}

      {filterParam === "action" && !isLoading && posts.length === 0 && (
        <div className="pulse-card p-8 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-teal/40 mb-3" />
          <p className="font-medium">Nothing waiting on you</p>
          <p className="text-sm text-muted-foreground mt-1">Create content in Studio or generate from home.</p>
          <Link href="/studio" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">
            Open Create Studio →
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === "story" ? "Delete story?" : "Delete post?"}
        description={
          deleteTarget
            ? `"${deleteTarget.item.title}" will be removed permanently along with its schedule entries.`
            : ""
        }
        pending={removePost.isPending || removeStory.isPending}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={handleConfirmDelete}
      />

      {showPosts && posts.length > 0 && (
        <section className="space-y-4">
          {tab === "all" && (
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Posts · {posts.length}
            </h2>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
            {posts.map((post) => (
              <BoardPostCard
                key={post.id}
                post={post}
                planItems={planItems}
                onDelete={() => setDeleteTarget({ kind: "post", item: post })}
                onActionMessage={(msg) => {
                  setActionMsg(msg);
                  setTimeout(() => setActionMsg(""), 5000);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {showStories && stories.length > 0 && (
        <section className="space-y-4">
          {tab === "all" && (
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              Stories · {stories.length}
            </h2>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-stagger">
            {stories.map((story) => (
              <BoardStoryCard
                key={story.id}
                story={story}
                onDelete={() => setDeleteTarget({ kind: "story", item: story })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BoardPostCard({
  post,
  planItems,
  onDelete,
  onActionMessage,
}: {
  post: Post;
  planItems: ContentIdea[];
  onDelete: () => void;
  onActionMessage: (msg: string) => void;
}) {
  const thumb = post.media_assets[0]?.url;
  const platforms = post.variants.map((v) => v.platform);
  const meta = postBoardMeta(post, planItems);
  const caption = post.variants.find((v) => v.caption?.trim())?.caption ?? "";

  return (
    <article className="pulse-card-hover overflow-hidden flex flex-col">
      <Link href={`/posts/${post.id}`} className="group block">
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden aspect-[4/3]">
          {thumb ? (
            <AuthImage
              src={thumb}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <span className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
            Post
          </span>
          {meta.category && (
            <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-[10px] font-semibold px-2 py-1 rounded-full text-foreground">
              {meta.category}
            </span>
          )}
          {post.media_assets.length > 1 && (
            <span className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              {post.media_assets.length} slides
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/posts/${post.id}`}
            className="font-semibold text-sm leading-snug break-words hover:text-primary transition-colors flex-1"
          >
            {post.title}
          </Link>
          <StatusBadge status={post.status} />
        </div>
        {caption && (
          <VisibleContent text={caption} maxLines={4} className="text-xs text-muted-foreground" />
        )}
        <SourceMeta sourceDate={meta.sourceDate} sourceUrl={meta.sourceUrl} addedDate={post.created_at} />
        <div className="flex items-center justify-between pt-1 mt-auto">
          <PlatformBadges platforms={platforms} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
          <PostNextAction post={post} onDone={onActionMessage} onError={onActionMessage} />
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border/60"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function BoardStoryCard({ story, onDelete }: { story: Story; onDelete: () => void }) {
  const meta = storyBoardMeta(story);

  return (
    <article className="pulse-card-hover overflow-hidden flex flex-col">
      <Link href={`/stories/${story.id}`} className="group block">
        <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <AuthImage
            src={story.image_url}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
            Story
          </span>
          {meta.category && (
            <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-[10px] font-semibold px-2 py-1 rounded-full text-foreground">
              {meta.category}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <Link
          href={`/stories/${story.id}`}
          className="font-semibold text-sm leading-snug break-words hover:text-primary transition-colors"
        >
          {story.title}
        </Link>
        {story.category && (
          <p className="text-xs font-medium text-muted-foreground">
            <Tag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            {story.category}
          </p>
        )}
        {meta.sourceUrl ? (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 break-all">
            <Link2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {meta.sourceUrl.replace(/^https?:\/\//, "")}
          </p>
        ) : (
          <p className="text-xs text-gray-400">No source link yet</p>
        )}
        <SourceMeta sourceDate={meta.sourceDate} sourceUrl={meta.sourceUrl} addedDate={story.created_at} />
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60 mt-auto">
          <Link
            href={`/stories/${story.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border/60"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function SourceMeta({
  sourceDate,
  sourceUrl,
  addedDate,
}: {
  sourceDate: string | null;
  sourceUrl: string | null;
  addedDate: string;
}) {
  const formattedSource = formatBoardDate(sourceDate);
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {formattedSource ? (
        <p className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-primary/70" />
          <span>
            Source · <strong className="font-medium text-foreground">{formattedSource}</strong>
          </span>
        </p>
      ) : sourceUrl ? (
        <p className="text-amber-700/80">Source date not set</p>
      ) : null}
      <p className="text-[11px] text-gray-400">
        Added {safeFormatDate(addedDate)}
      </p>
    </div>
  );
}

function safeFormatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "teal";
  href?: string;
}) {
  const colors =
    accent === "primary"
      ? "text-primary bg-primary/10"
      : accent === "teal"
        ? "text-teal bg-teal/15"
        : "text-muted-foreground bg-secondary";
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="pulse-card-hover p-4 flex items-center gap-3">
        {inner}
      </Link>
    );
  }
  return <div className="pulse-card-hover p-4 flex items-center gap-3">{inner}</div>;
}

function TabLink({
  active,
  href,
  label,
  count,
}: {
  active: boolean;
  href: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-secondary/80 border border-border/60"
      }`}
    >
      {label}
      <span
        className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/20" : "bg-background"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
