"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Sparkles, Wand2 } from "lucide-react";
import { saveIdeateDraftForSubmit } from "@/lib/ideate-submit-handoff";
import { TrendScanner } from "@/components/ideas/trend-scanner";
import { api } from "@/lib/api";
import { draftSocialCaptions } from "@/lib/caption-draft";
import type { TrendItem } from "@/lib/trends-types";

export default function IdeatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [captions, setCaptions] = useState<{ instagram: string; facebook: string; linkedin: string } | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);

  const [captionMsg, setCaptionMsg] = useState("");
  const [enhancingCaptions, setEnhancingCaptions] = useState(false);
  const captionEnhanceGen = useRef(0);

  function generateCaptions() {
    const title = topic.trim() || "CPBH post";
    const source = notes.trim() || topic.trim();
    if (!title && !source) return;

    const local = draftSocialCaptions(title, source);
    setCaptions(local);
    setCaptionMsg("Captions ready — copy one below or continue to Send draft.");
    setTimeout(() => setCaptionMsg(""), 6000);

    const gen = ++captionEnhanceGen.current;
    setEnhancingCaptions(true);
    void (async () => {
      try {
        const fromApi = await Promise.race([
          api.ideation.captions({ title, source_text: source }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 4500)
          ),
        ]);
        if (gen !== captionEnhanceGen.current) return;
        const rich =
          fromApi.instagram.includes("#") || /[\u{1F300}-\u{1FAFF}]/u.test(fromApi.instagram);
        if (rich) setCaptions(fromApi);
      } catch {
        /* local draft already shown */
      } finally {
        if (gen === captionEnhanceGen.current) setEnhancingCaptions(false);
      }
    })();
  }

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

  function useHotTopic(trend: TrendItem) {
    setTopic(trend.title);
    setNotes(
      [trend.suggested_hook, trend.summary, trend.url ? `Source: ${trend.url}` : ""]
        .filter(Boolean)
        .join("\n\n")
    );
    setCaptions(null);
    document.getElementById("ideate-topic")?.focus();
  }

  function goToSubmit() {
    saveIdeateDraftForSubmit({
      topic: topic.trim(),
      notes: notes.trim() || undefined,
      captions: captions ?? undefined,
    });
    router.push("/submit");
  }

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
          <TrendScanner layout="sidebar" onUseTopic={useHotTopic} />
        </aside>

        <div className="space-y-6 min-w-0">
          <section className="pulse-card p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-teal" />
              Caption drafts
            </h2>
            <p className="text-xs text-muted-foreground">
              Drafts hooks, emojis, and CPBH hashtags from your topic — no OpenAI key required. Edit before you send
              draft.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Topic</span>
              <input
                id="ideate-topic"
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
              disabled={!topic.trim() && !notes.trim()}
              onClick={generateCaptions}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate captions
            </button>
            {enhancingCaptions && (
              <p className="text-xs text-muted-foreground">Optional AI polish in the background…</p>
            )}
            {captionMsg && (
              <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-3 py-2 rounded-lg">{captionMsg}</p>
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

          <button
            type="button"
            onClick={goToSubmit}
            className="pulse-card w-full text-left flex items-center justify-between p-5 border-2 border-teal/30 hover:border-teal/50 transition-colors"
          >
            <div>
              <p className="font-bold">Ready to submit?</p>
              <p className="text-sm text-muted-foreground">
                Continue to Send draft — your captions come with you (including LinkedIn).
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-teal shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
