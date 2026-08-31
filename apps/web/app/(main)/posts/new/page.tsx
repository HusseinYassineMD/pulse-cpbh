"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function NewPostPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    setError("");
    setLoading(true);

    const template = templates?.find((t) => t.post_creator_id === templateId);

    try {
      const post = await api.posts.create({
        title: template?.title || templateId,
        post_creator_id: templateId,
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-2">New post</h1>
      <p className="text-muted-foreground text-sm mb-6">Pick a topic — Pulse will generate slides and captions from Post_Creator.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loadingTemplates && <p className="text-gray-400 text-sm">Loading templates...</p>}

      {templates?.length === 0 && !loadingTemplates && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm">
          No templates found. Make sure Post_Creator is at <code>../../Post_Creator</code> relative to the API.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          {templates?.map((t) => (
            <label
              key={t.post_creator_id}
              className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                templateId === t.post_creator_id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-teal/40"
              }`}
            >
              <input
                type="radio"
                name="template"
                value={t.post_creator_id}
                checked={templateId === t.post_creator_id}
                onChange={() => setTemplateId(t.post_creator_id)}
                className="accent-primary"
              />
              <span className="font-medium">{t.title}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !templateId}
          className="w-full py-2.5 btn-primary disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create post"}
        </button>
      </form>
    </div>
  );
}
