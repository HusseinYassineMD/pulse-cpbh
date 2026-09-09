"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { rememberCategory } from "@/lib/plan-categories";

export default function NewStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState("");
  const [sourcePublishDate, setSourcePublishDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onFileChange(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a story image");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const story = await api.stories.create({
        title: title.trim() || "Untitled story",
        source_url: sourceUrl.trim() || undefined,
        category: category.trim() || undefined,
        source_publish_date: sourcePublishDate || undefined,
        image: file,
      });
      rememberCategory(category);
      router.push(`/stories/${story.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save story");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to board
      </Link>

      <h1 className="text-2xl font-bold mb-2">Add story</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Upload one vertical image and paste the Substack link so you know which article it came from.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Story image</label>
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/40 transition-colors">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 rounded-xl object-contain aspect-[9/16]" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-300" />
                <span className="text-sm text-muted-foreground">Click to upload PNG or JPG</span>
              </>
            )}
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Label (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Exercise & APOE4"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Nutrition — free text, learns as you go"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Substack link</label>
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
          <p className="text-[11px] text-muted-foreground mt-1">When the original article was published</p>
        </div>

        <button type="submit" disabled={loading || !file} className="w-full py-2.5 btn-primary disabled:opacity-50">
          {loading ? "Saving..." : "Save story"}
        </button>
      </form>
    </div>
  );
}
