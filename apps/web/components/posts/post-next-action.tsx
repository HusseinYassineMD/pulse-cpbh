"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, Check, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getPostNextStep } from "@/lib/post-workflow";
import type { Post } from "@/lib/types";

type Props = {
  post: Post;
  size?: "sm" | "md";
  onDone?: (message: string) => void;
  onError?: (message: string) => void;
};

export function PostNextAction({ post, size = "sm", onDone, onError }: Props) {
  const queryClient = useQueryClient();
  const step = getPostNextStep(post);

  const approve = useMutation({
    mutationFn: () => api.posts.approve(post.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", post.id], updated);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone?.(`"${post.title}" approved — ready to schedule`);
    },
    onError: (e) => onError?.(e instanceof ApiError ? e.message : "Could not approve"),
  });

  const btnClass =
    size === "md"
      ? "inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold"
      : "inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium";

  if (step.kind === "approve") {
    return (
      <button
        type="button"
        onClick={() => approve.mutate()}
        disabled={approve.isPending}
        className={`${btnClass} bg-teal text-white hover:opacity-90 disabled:opacity-50`}
      >
        {approve.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        {approve.isPending ? "Approving…" : step.label}
      </button>
    );
  }

  const primary =
    step.kind === "schedule"
      ? `${btnClass} btn-primary`
      : `${btnClass} border border-border hover:bg-secondary`;

  const Icon = step.kind === "schedule" ? Calendar : ArrowRight;

  return (
    <Link href={step.href} className={primary}>
      <Icon className="w-3.5 h-3.5" />
      {step.label}
    </Link>
  );
}
