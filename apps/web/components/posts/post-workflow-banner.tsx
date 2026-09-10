"use client";

import type { Post } from "@/lib/types";
import { getPostNextStep, postWorkflowStep } from "@/lib/post-workflow";
import { PostNextAction } from "@/components/posts/post-next-action";
import { StatusBadge } from "@/components/ui/status-badge";

const STEPS = ["Draft", "Ready", "Approved", "Scheduled", "Published"];

export function PostWorkflowBanner({
  post,
  onMessage,
}: {
  post: Post;
  onMessage?: (msg: string) => void;
}) {
  const step = getPostNextStep(post);
  const progress = Math.min(4, Math.max(0, postWorkflowStep(post)));

  return (
    <div className="pulse-card p-4 sm:p-5 space-y-4 border border-teal/20 bg-teal/[0.03]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal mb-1">Workflow</p>
          <p className="text-sm font-medium">{step.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={post.status} />
          <PostNextAction post={post} size="md" onDone={onMessage} onError={onMessage} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col gap-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= progress ? "bg-teal" : "bg-secondary"
              }`}
            />
            <span
              className={`text-[9px] uppercase tracking-wide hidden sm:block ${
                i <= progress ? "text-teal font-semibold" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
