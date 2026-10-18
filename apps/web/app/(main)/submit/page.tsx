"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { isStaticMode } from "@/lib/base-path";
import { HOSTED_APP_URL } from "@/lib/static-config";
import { readSubmitName, writeSubmitName } from "@/lib/submit-prefs";
import { SUBMIT_PLATFORMS } from "@/lib/submit-platforms";

export default function SubmitDraftPage() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "facebook", "linkedin"]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function togglePlatform(id: string) {
    setPlatforms((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((p) => p !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  }

  useEffect(() => {
    setName(readSubmitName());
  }, []);

  const submit = useMutation({
    mutationFn: async () => {
      const title = topic.trim() || caption.trim().slice(0, 80) || "Untitled draft";
      const form = new FormData();
      form.set("title", title);
      form.set("submitted_by", name.trim());
      form.set("unified_caption", caption.trim());
      form.set("caption_instagram", caption.trim());
      form.set("caption_facebook", caption.trim());
      form.set("caption_linkedin", caption.trim());
      platforms.forEach((p) => form.append("platforms", p));
      if (files) {
        Array.from(files).forEach((f) => form.append("images", f));
      }
      return api.posts.submitStudentDraft(form);
    },
    onSuccess: () => {
      writeSubmitName(name);
      setDone(true);
      setError("");
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Could not send — try again.";
      setError(
        msg.includes("500") || msg.toLowerCase().includes("internal")
          ? "Server error — ask your lead to restart the team app, then try again."
          : msg
      );
    },
  });

  if (done) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 animate-fade-in text-center">
        <CheckCircle2 className="w-14 h-14 text-teal mx-auto" />
        <h1 className="text-2xl font-bold">Sent!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your lead will review this and schedule it. You do not need to do anything else.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setTopic("");
            setCaption("");
            setFiles(null);
          }}
          className="btn-primary px-6 py-3 rounded-xl font-medium"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10 animate-fade-in">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Send a draft</h1>
        <p className="text-sm text-muted-foreground">Fill this out once. Your lead handles the rest.</p>
      </div>

      {isStaticMode() && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
          Preview site only — drafts are not saved for the team.{" "}
          {HOSTED_APP_URL ? (
            <a href={`${HOSTED_APP_URL}/submit/`} className="font-semibold underline">
              Use the team link instead
            </a>
          ) : (
            "Ask your lead for the team app link."
          )}
        </p>
      )}

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Please enter your name.");
            return;
          }
          if (!caption.trim()) {
            setError("Please paste your caption.");
            return;
          }
          if (platforms.length === 0) {
            setError("Pick at least one place to post.");
            return;
          }
          submit.mutate();
        }}
      >
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>
        )}

        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input mt-1.5 w-full text-base py-3"
            placeholder="First and last name"
            autoComplete="name"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Topic (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="form-input mt-1.5 w-full text-base py-3"
            placeholder="e.g. Sleep and brain health"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={8}
            className="form-input mt-1.5 w-full text-base"
            placeholder="Paste your post text…"
            required
          />
        </label>

        <fieldset className="block">
          <legend className="text-sm font-medium">Where should this go?</legend>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Your lead schedules the actual post — you only choose the channels.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUBMIT_PLATFORMS.map(({ id, label }) => {
              const on = platforms.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePlatform(id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors min-h-[44px] ${
                    on
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-border text-muted-foreground hover:border-teal/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium flex items-center gap-2">
            <ImagePlus className="w-4 h-4" />
            Photos (optional)
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-2 block w-full text-sm"
            onChange={(e) => setFiles(e.target.files)}
          />
          <p className="text-xs text-muted-foreground mt-1">Carousel slides, in order.</p>
        </label>

        <button
          type="submit"
          disabled={submit.isPending}
          className="btn-primary w-full py-4 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {submit.isPending ? "Sending…" : "Send to my lead"}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Team lead?{" "}
        <Link href="/review" className="text-teal font-medium hover:underline">
          Open review
        </Link>
      </p>
    </div>
  );
}
