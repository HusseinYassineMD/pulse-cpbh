"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RotateCcw, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { StudentDraftDetails } from "@/components/posts/student-draft-details";
import { ReviewScheduleDialog } from "@/components/review/review-schedule-dialog";
import { submittedBy } from "@/lib/social-workflow";
import { draftTicketLabel } from "@/lib/post-ticket";
import { postPageHref } from "@/lib/post-url";
import type { Post } from "@/lib/types";

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [schedulePost, setSchedulePost] = useState<Post | null>(null);
  const [returnPost, setReturnPost] = useState<Post | null>(null);
  const [returnNotes, setReturnNotes] = useState("");

  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ["posts", "review-queue"],
    queryFn: async () => {
      const [staged, inReview] = await Promise.all([
        api.posts.list({ status: "staged", limit: 50 }),
        api.posts.list({ status: "in_review", limit: 50 }),
      ]);
      const byId = new Map<string, Post>();
      [...staged.items, ...inReview.items].forEach((p) => byId.set(p.id, p));
      return {
        queue: Array.from(byId.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      };
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setMsg("Draft deleted.");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not delete"),
  });

  const sendBack = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => api.posts.returnToStudent(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setReturnPost(null);
      setReturnNotes("");
      setMsg("Sent back to student for edits. Reminders paused until they resubmit.");
      setTimeout(() => setMsg(""), 5000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not send back"),
  });

  const queue = data?.queue ?? [];

  function confirmDelete(post: Post) {
    const ticket = draftTicketLabel(post);
    if (!window.confirm(`Delete ${ticket} "${post.title}" permanently?`)) return;
    remove.mutate(post.id);
  }

  function platformHints(post: Post): string[] {
    return post.variants.map((v) => v.platform);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Review drafts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open tickets from students — approve &amp; schedule, send back for edits, or delete. Unfinished tickets email
          Tiffany every 12 hours.
        </p>
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
          <p className="font-medium">No open tickets</p>
          <p className="text-sm text-muted-foreground">New submissions appear here with a ticket ID and email alert.</p>
        </div>
      )}

      <div className="space-y-3">
        {queue.map((post) => {
          const thumb = post.media_assets[0];
          const author = submittedBy(post);
          const ticket = draftTicketLabel(post);
          return (
            <article key={post.id} className="pulse-card p-4 space-y-3">
              <div className="flex gap-4">
                {thumb?.url && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <AuthImage src={thumb.url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-semibold text-teal tracking-wide">{ticket}</p>
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
              <StudentDraftDetails post={post} compact />
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href={postPageHref(post.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-primary text-sm font-semibold"
                  >
                    Open &amp; edit
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSchedulePost(post)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl border border-teal/30 bg-teal/10 text-teal text-sm font-semibold"
                  >
                    Approve &amp; schedule
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnPost(post);
                      setReturnNotes("");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium border border-border hover:bg-muted/50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Send back for edits
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
              </div>
            </article>
          );
        })}
      </div>

      {schedulePost && (
        <ReviewScheduleDialog
          postId={schedulePost.id}
          defaultPlatforms={platformHints(schedulePost)}
          open={!!schedulePost}
          onClose={() => setSchedulePost(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
            setMsg(`${draftTicketLabel(schedulePost)} scheduled — see Calendar.`);
            setSchedulePost(null);
          }}
        />
      )}

      {returnPost && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-bold">Send back — {draftTicketLabel(returnPost)}</h2>
            <p className="text-sm text-muted-foreground">Student sees your notes and can resubmit the same ticket.</p>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              rows={4}
              className="form-input w-full text-sm"
              placeholder="What should they change?"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setReturnPost(null)} className="flex-1 py-3 rounded-xl border border-border text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={sendBack.isPending || !returnNotes.trim()}
                onClick={() => sendBack.mutate({ id: returnPost.id, notes: returnNotes.trim() })}
                className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold"
              >
                {sendBack.isPending ? "Sending…" : "Send back"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-2">
        Scheduled posts →{" "}
        <Link href="/calendar" className="text-teal font-medium hover:underline">
          Calendar
        </Link>
      </p>
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
