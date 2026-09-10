"use client";

import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api } from "@/lib/api";

export function PublishAttempts({ postId }: { postId: string }) {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ["publish-attempts", postId],
    queryFn: () => api.posts.publishAttempts(postId),
  });

  if (isLoading) return null;
  if (!attempts?.length) return null;

  return (
    <div className="pulse-card p-5 space-y-3">
      <h2 className="font-semibold text-sm flex items-center gap-2">
        <Radio className="w-4 h-4 text-teal" />
        Publish history
      </h2>
      <ul className="space-y-2">
        {attempts.map((a) => (
          <li
            key={a.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm border border-border/60 rounded-lg px-3 py-2"
          >
            <span className="font-medium capitalize">{a.platform}</span>
            <span className={a.status === "success" ? "text-teal" : "text-red-600"}>{a.status}</span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(a.attempted_at), "MMM d, yyyy · h:mm a")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
