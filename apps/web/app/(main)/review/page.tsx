"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { submittedBy } from "@/lib/social-workflow";
import { postPageHref } from "@/lib/post-url";
import type { Post } from "@/lib/types";

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const { data, isLoading } = useQuery({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setMsg("Approved — open the post to pick a date.");
      setTimeout(() => setMsg(""), 5000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not approve"),
  });

  const returnDraft = useMutation({
    mutationFn: (id: string) => api.posts.returnToStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setMsg("Sent back to the student.");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not update"),
  });

  const queue = data?.queue ?? [];
  const readyToSchedule = data?.readyToSchedule ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Review drafts</h1>
        <p className="text-sm text-muted-foreground mt-1">Open a draft to edit, then approve and schedule.</p>
      </div>

      {msg && <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{msg}</p>}
      {err && <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{err}</p>}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && queue.length === 0 && (
        <div className="pulse-card p-8 text-center space-y-2">
          <p className="font-medium">No drafts right now</p>
          <p className="text-sm text-muted-foreground">When students send drafts, they show up here.</p>
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
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => returnDraft.mutate(post.id)}
                  disabled={returnDraft.isPending}
                  className="inline-flex items-center justify-center gap-1 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary"
                >
                  <RotateCcw className="w-4 h-4" />
                  Send back
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {readyToSchedule.length > 0 && (
        <section className="space-y-2 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ready to schedule</h2>
          {readyToSchedule.map((post) => (
            <Link
              key={post.id}
              href={postPageHref(post.id, "schedule")}
              className="pulse-card block p-4 hover:border-teal/25"
            >
              <p className="font-medium truncate">{post.title}</p>
              <p className="text-xs text-teal mt-1">Pick date & platforms →</p>
            </Link>
          ))}
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
