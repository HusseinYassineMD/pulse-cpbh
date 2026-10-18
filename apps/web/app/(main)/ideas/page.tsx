"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { TrendScanner } from "@/components/ideas/trend-scanner";
import { CONTENT_IDEA_PROMPTS } from "@/lib/insights";
import { deliverableLabel } from "@/lib/plan-team";
import type { PlanDeliverable } from "@/lib/types";

type IdeaPrompt = (typeof CONTENT_IDEA_PROMPTS)[number];

export default function IdeasPage() {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const ideas = CONTENT_IDEA_PROMPTS;

  const addToPlan = useMutation({
    mutationFn: (idea: IdeaPrompt) =>
      api.plan.create({
        title: idea.title,
        theme: idea.theme,
        deliverable: idea.deliverable,
        notes: idea.hook,
        status: "idea",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setMsg(`Added "${created.title}" to Plan parking lot`);
      setErr("");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not add to Plan"),
  });

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content studio</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-primary" />
            Ideas
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Scan live brain-health headlines, then send anything you like to Plan or Create Studio.
          </p>
        </div>
      </div>

      {msg && (
        <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{msg}</p>
      )}
      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{err}</p>
      )}

      <TrendScanner />

      {ideas.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <article key={idea.title} className="pulse-card-hover p-5 flex flex-col gap-3">
              <span className="inline-block w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {idea.theme}
              </span>
              <h2 className="font-semibold text-base leading-snug">{idea.title}</h2>
              <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{idea.hook}</p>
              <p className="text-xs text-muted-foreground">
                Suggested format:{" "}
                <strong className="text-foreground">{deliverableLabel(idea.deliverable as PlanDeliverable)}</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                <Link
                  href={`/studio?title=${encodeURIComponent(idea.title)}&notes=${encodeURIComponent(idea.hook)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium btn-primary"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create in Studio
                </Link>
                <button
                  type="button"
                  onClick={() => addToPlan.mutate(idea)}
                  disabled={addToPlan.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-border hover:bg-secondary disabled:opacity-50"
                >
                  Add to Plan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pulse-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal" />
            Have raw material already?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Open Create Studio to paste anything and turn it into captions — or pull from Plan.
          </p>
        </div>
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25 shrink-0"
        >
          Open Create Studio
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
