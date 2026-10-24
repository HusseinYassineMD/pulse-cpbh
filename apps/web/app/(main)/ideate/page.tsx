"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, Sparkles, Wand2 } from "lucide-react";
import { TrendScanner } from "@/components/ideas/trend-scanner";
import { api, ApiError } from "@/lib/api";

export default function IdeatePage() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [captions, setCaptions] = useState<{ instagram: string; facebook: string; linkedin: string } | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);

  const [captionMsg, setCaptionMsg] = useState("");

  const gen = useMutation({
    mutationFn: async () => {
      const title = topic.trim() || "CPBH post";
      const source = notes.trim() || topic.trim();
      try {
        return await api.ideation.captions({ title, source_text: source });
      } catch {
        const base = `${title}\n\n${source.slice(0, 400)}`.trim();
        return {
          instagram: base.slice(0, 280),
          facebook: base.slice(0, 600),
          linkedin: base.slice(0, 1200),
        };
      }
    },
    onSuccess: (data) => {
      setCaptions(data);
      setCaptionMsg("Captions ready — copy one below or continue to Send draft.");
      setTimeout(() => setCaptionMsg(""), 6000);
    },
    onError: () => setCaptionMsg(""),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic");
    if (t) setTopic(t);
  }, []);

  function copyCaption(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const draftHref = () => {
    const params = new URLSearchParams();
    if (topic.trim()) params.set("topic", topic.trim());
    const cap = captions?.instagram || notes.trim();
    if (cap) params.set("caption", cap.slice(0, 2000));
    const q = params.toString();
    return q ? `/submit?${q}` : "/submit";
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fade-in">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Ideation</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Explore hot topics, draft captions from your notes, then send a draft to your lead.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-4">
          <TrendScanner layout="sidebar" />
        </aside>

        <div className="space-y-6 min-w-0">
          <section className="pulse-card p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-teal" />
              Caption drafts
            </h2>
            <p className="text-xs text-muted-foreground">
              Builds simple platform captions from what you paste — no AI account required. You can also skip this and
              write your caption directly on Send draft.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Topic</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="form-input mt-1.5 w-full"
                placeholder="e.g. Sleep and memory"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Notes or source text</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="form-input mt-1.5 w-full"
                placeholder="Paste bullets, article summary, or patient handout text…"
              />
            </label>
            <button
              type="button"
              disabled={gen.isPending || (!topic.trim() && !notes.trim())}
              onClick={() => gen.mutate()}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {gen.isPending ? "Generating…" : "Generate captions"}
            </button>
            {captionMsg && (
              <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-3 py-2 rounded-lg">{captionMsg}</p>
            )}
            {gen.isError && (
              <p className="text-sm text-red-700">
                {gen.error instanceof ApiError ? gen.error.message : "Could not generate — add notes and try again."}
              </p>
            )}
            {captions && (
              <div className="space-y-3 pt-2 border-t border-border">
                {(["instagram", "facebook", "linkedin"] as const).map((platform) => (
                  <div key={platform} className="rounded-xl bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{platform}</span>
                      <button
                        type="button"
                        onClick={() => copyCaption(captions[platform], platform)}
                        className="text-xs text-teal font-medium inline-flex items-center gap-1"
                      >
                        {copied === platform ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{captions[platform]}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link
            href={draftHref()}
            className="pulse-card flex items-center justify-between p-5 border-2 border-teal/30 hover:border-teal/50 transition-colors"
          >
            <div>
              <p className="font-bold">Ready to submit?</p>
              <p className="text-sm text-muted-foreground">Send draft with your caption and content link.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-teal shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
