"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { submittedBy } from "@/lib/social-workflow";
import { postPageHref } from "@/lib/post-url";
import type { Post } from "@/lib/types";

export default function ReviewQueuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ["posts", "review-queue"],
    queryFn: async () => {
      const [staged, inReview, approved] = await Promise.all([
        api.posts.list({ status: "staged", limit: 50 }),
        api.posts.list({ status: "in_review", limit: 50 }),
        api.posts.list({ status: "approved", limit: 20 }),
      ]);
      const byId = new Map<string, Post>();
      [...staged.items, ...inReview.items].forEach((p) => byId.set(p.id, p));
      return {
        queue: Array.from(byId.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        readyToSchedule: approved.items.filter((p) => p.status === "approved").slice(0, 5),
      };
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.posts.approve(id),
    onSuccess: (_post, id) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      router.push(`/calendar?post=${encodeURIComponent(id)}`);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not approve"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setMsg("Draft deleted.");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not delete"),
  });

  const queue = data?.queue ?? [];
  const readyToSchedule = data?.readyToSchedule ?? [];

  function confirmDelete(post: Post) {
    if (
      !window.confirm(
        `Delete "${post.title}" permanently? This cannot be undone.`
      )
    ) {
      return;
    }
    remove.mutate(post.id);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Review drafts</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit, approve for schedule, or delete.</p>
      </div>

      {msg && <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{msg}</p>}
      {err && <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{err}</p>}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
          Could not load drafts — {loadError instanceof ApiError ? loadError.message : "check connection"}.
          <button type="button" className="ml-2 underline font-medium" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}

      {!isLoading && queue.length === 0 && (
        <div className="pulse-card p-8 text-center space-y-2">
          <p className="font-medium">No drafts right now</p>
          <p className="text-sm text-muted-foreground">
            When students send drafts on the <strong>same team link</strong> as this page, they show up here.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {queue.map((post) => {
          const thumb = post.media_assets[0];
          const author = submittedBy(post);
          return (
            <article key={post.id} className="pulse-card p-4 space-y-3">
              <div className="flex gap-4">
                {thumb?.url && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <AuthImage src={thumb.url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold truncate">{post.title}</h2>
                  {author && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {author} · {safeDate(post.updated_at)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {post.variants[0]?.caption || "No caption"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={postPageHref(post.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-primary text-sm font-semibold"
                >
                  Open & edit
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => approve.mutate(post.id)}
                  disabled={approve.isPending}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl border border-teal/30 bg-teal/10 text-teal text-sm font-semibold"
                >
                  Approve → Schedule
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(post)}
                  disabled={remove.isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {readyToSchedule.length > 0 && (
        <section className="space-y-2 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">On Schedule page</h2>
          <p className="text-xs text-muted-foreground">
            These are approved — open <Link href="/calendar" className="text-teal font-medium hover:underline">Schedule</Link>{" "}
            to pick a date.
          </p>
        </section>
      )}
    </div>
  );
}

function safeDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return "";
  }
}
