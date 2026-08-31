"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformBadges } from "@/components/ui/platform-badges";

export default function PostsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => api.posts.list({ limit: 50 }),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content library</p>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          {data && (
            <p className="text-muted-foreground mt-1">{data.total} generated · ready to schedule</p>
          )}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary text-sm transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4" />
          Generate new
        </Link>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="pulse-card h-72 animate-pulse bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {data?.items.length === 0 && !isLoading && (
        <div className="pulse-card p-16 text-center">
          <Layers className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-muted-foreground mb-4">No posts yet</p>
          <Link href="/" className="text-primary hover:underline font-semibold">
            Generate from home →
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {data.items.map((post) => {
            const thumb = post.media_assets[0]?.url;
            const isStory = post.source_config?.type === "story";
            const platforms = post.variants.map((v) => v.platform);

            return (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="pulse-card-hover overflow-hidden group"
              >
                <div className={`relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden ${isStory ? "aspect-[9/16] max-h-52" : "aspect-[4/3]"}`}>
                  {thumb ? (
                    <>
                      <AuthImage
                        src={thumb}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {post.media_assets.length > 1 && (
                    <span className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {post.media_assets.length} slides
                    </span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-semibold line-clamp-2 drop-shadow">{post.title}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </p>
                    <StatusBadge status={post.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <PlatformBadges platforms={platforms} />
                    <span className="text-xs text-gray-400 font-medium">
                      {format(new Date(post.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
