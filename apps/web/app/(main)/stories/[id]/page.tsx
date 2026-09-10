"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, ExternalLink, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { rememberCategory } from "@/lib/plan-categories";
import { AuthImage } from "@/components/auth-image";
import { formatBoardDate } from "@/lib/board-stats";

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [sourcePublishDate, setSourcePublishDate] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => api.stories.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (story && !initialized) {
      setSourceUrl(story.source_url || "");
      setTitle(story.title);
      setCategory(story.category || "");
      setSourcePublishDate(story.source_publish_date || "");
      setInitialized(true);
    }
  }, [story, initialized]);

  const save = useMutation({
    mutationFn: () =>
      api.stories.update(id, {
        title: title.trim(),
        source_url: sourceUrl.trim() || null,
        category: category.trim() || null,
        source_publish_date: sourcePublishDate || null,
      }),
    onSuccess: (updated) => {
      rememberCategory(category);
      queryClient.setQueryData(["story", id], updated);
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setTitle(updated.title);
      setSourceUrl(updated.source_url || "");
      setCategory(updated.category || "");
      setSourcePublishDate(updated.source_publish_date || "");
      setError("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save"),
  });

  const replaceImage = useMutation({
    mutationFn: (file: File) => api.stories.replaceImage(id, file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["story", id], updated);
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setInfoMsg("Image updated");
      setTimeout(() => setInfoMsg(""), 3000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not replace image"),
  });

  const remove = useMutation({
    mutationFn: () => api.stories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      router.push("/board");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not delete"),
  });

  async function copyLink() {
    if (!sourceUrl.trim()) return;
    await navigator.clipboard.writeText(sourceUrl.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!story) return <p className="text-red-600">Story not found.</p>;

  return (
    <div className="max-w-md space-y-6">
      <Link href="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" />
        Back to board
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title || story.title}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {formatBoardDate(story.source_publish_date)
              ? `Source · ${formatBoardDate(story.source_publish_date)}`
              : `Added ${format(new Date(story.created_at), "MMMM d, yyyy")}`}
          </p>
        </div>
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete story"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {infoMsg && (
        <div className="p-3 bg-teal/10 text-teal-900 border border-teal/25 rounded-lg text-sm">{infoMsg}</div>
      )}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="pulse-card overflow-hidden max-w-xs mx-auto">
        <div className="relative bg-gray-50 aspect-[9/16]">
          <AuthImage src={story.image_url} alt={story.title} className="w-full h-full object-contain" />
        </div>
        <label className="flex items-center justify-center gap-2 px-4 py-3 border-t text-sm font-medium cursor-pointer hover:bg-secondary transition-colors">
          <Upload className="w-4 h-4" />
          {replaceImage.isPending ? "Uploading…" : "Replace image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={replaceImage.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) replaceImage.mutate(file);
            }}
          />
        </label>
      </div>

      <div className="pulse-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Label</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Nutrition"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Substack link</label>
          <p className="text-xs text-muted-foreground mb-2">
            Paste the article URL — copy it when you post this story to Instagram or Facebook.
          </p>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://yoursubstack.substack.com/p/..."
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Source publish date</label>
          <input
            type="date"
            value={sourcePublishDate}
            onChange={(e) => setSourcePublishDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="px-4 py-2 btn-primary text-sm rounded-xl disabled:opacity-50"
          >
            {save.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={copyLink}
            disabled={!sourceUrl.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4 text-teal" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {sourceUrl.trim() && (
            <a
              href={sourceUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
