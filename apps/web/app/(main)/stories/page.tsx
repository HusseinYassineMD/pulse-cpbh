"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link2, Plus, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";

export default function StoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: () => api.stories.list({ limit: 100 }),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Story library</p>
          <h1 className="text-3xl font-bold tracking-tight">Stories</h1>
          {data && (
            <p className="text-muted-foreground mt-1">{data.total} saved · one image each</p>
          )}
        </div>
        <Link
          href="/stories/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary text-sm transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add story
        </Link>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pulse-card aspect-[9/16] animate-pulse bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {data?.items.length === 0 && !isLoading && (
        <div className="pulse-card p-16 text-center">
          <Smartphone className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-muted-foreground mb-4">No stories yet</p>
          <Link href="/stories/new" className="text-primary hover:underline font-semibold">
            Add your first story →
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-stagger">
          {data.items.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.id}`}
              className="pulse-card-hover overflow-hidden group"
            >
              <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                <AuthImage
                  src={story.image_url}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {story.title}
                </p>
                {story.source_url ? (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5 line-clamp-2">
                    <Link2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {story.source_url.replace(/^https?:\/\//, "")}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">No Substack link yet</p>
                )}
                <p className="text-xs text-gray-400">{format(new Date(story.created_at), "MMM d, yyyy")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
