"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, Globe, Plus, Radar, RefreshCw, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { isStaticMode } from "@/lib/base-path";
import { deliverableLabel } from "@/lib/plan-team";
import type { TrendItem } from "@/lib/trends-types";
import type { PlanDeliverable } from "@/lib/types";

const TRENDS_OPEN_KEY = "pulse-trends-scanner-open";

function readTrendsOpen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TRENDS_OPEN_KEY) !== "closed";
}

function writeTrendsOpen(open: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRENDS_OPEN_KEY, open ? "open" : "closed");
}

export function TrendScanner() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setExpanded(readTrendsOpen());
    setMounted(true);
  }, []);

  // Preload trends on first visit so the page isn't empty
  useEffect(() => {
    if (!mounted || trends.length > 0 || scan.isPending) return;
    scan.mutate();
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpanded = (open: boolean) => {
    setExpanded(open);
    writeTrendsOpen(open);
  };

  const scan = useMutation({
    mutationFn: () => api.trends.scan({ limit: 12 }),
    onSuccess: (data) => {
      setTrends(data.items);
      setSources(data.sources_checked);
      setScannedAt(data.scanned_at);
      setErr("");
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not scan trends"),
  });

  const addToPlan = useMutation({
    mutationFn: (trend: TrendItem) =>
      api.plan.create({
        title: trend.title.slice(0, 200),
        theme: trend.theme,
        deliverable: trend.deliverable,
        notes: `${trend.suggested_hook}\n\nSource: ${trend.source}\n${trend.url}`,
        status: "idea",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setMsg(`Added "${created.title}" to Plan from trends`);
      setErr("");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not add to Plan"),
  });

  if (!mounted) return null;

  if (!expanded) {
    return (
      <section>
        <button
          type="button"
          onClick={() => toggleExpanded(true)}
          className="w-full pulse-card p-4 flex items-center justify-between gap-3 border border-teal/20 bg-gradient-to-r from-teal/[0.04] to-white hover:border-teal/35 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center shrink-0">
              <Radar className="w-5 h-5 text-teal" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Trend scanner</p>
              <p className="text-xs text-muted-foreground truncate">
                {trends.length > 0
                  ? `${trends.length} trend${trends.length === 1 ? "" : "s"} loaded · tap to open`
                  : "Scan the web for latest brain-health headlines"}
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="pulse-card p-5 sm:p-6 border border-teal/20 bg-gradient-to-br from-teal/[0.04] to-white">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal flex items-center gap-2">
                <Radar className="w-4 h-4" />
                Trend scanner
              </p>
              <button
                type="button"
                onClick={() => toggleExpanded(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border shrink-0"
                aria-label="Hide trend scanner"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hide</span>
              </button>
            </div>
            <h2 className="font-bold text-lg">What&apos;s trending in brain health?</h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Pulls recent headlines from Google News, BBC Health, and MedlinePlus — filtered for
              Alzheimer&apos;s prevention, cognition, and brain health. Turn any hit into a Plan idea.
            </p>
            {isStaticMode() && (
              <p className="text-xs text-teal-900 bg-teal/10 border border-teal/25 rounded-lg px-3 py-2 leading-relaxed">
                <strong>Live scan</strong> — pulls real headlines from Google News, BBC Health, and MedlinePlus
                right in your browser. Add any hit to Plan to start your content workflow.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium btn-primary disabled:opacity-50 shrink-0"
          >
            {scan.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Scan latest trends
              </>
            )}
          </button>
        </div>

        {msg && (
          <p className="mt-4 text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">
            {msg}
          </p>
        )}
        {err && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
            {err}
          </p>
        )}

        {scannedAt && trends.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Last scan · {safeFormat(scannedAt)}
            {sources.length > 0 && ` · Sources: ${sources.join(", ")}`}
          </p>
        )}
      </div>

      {trends.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {trends.map((trend) => (
            <article key={trend.id} className="pulse-card-hover p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal/15 text-teal">
                  {trend.source}
                </span>
                <a
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-1"
                  aria-label="Open source article"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <span className="inline-block w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {trend.theme}
              </span>
              <h3 className="font-semibold text-sm leading-snug line-clamp-3">{trend.title}</h3>
              {trend.summary && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{trend.summary}</p>
              )}
              <p className="text-xs text-muted-foreground italic border-l-2 border-teal/30 pl-2 line-clamp-2">
                {trend.suggested_hook}
              </p>
              <p className="text-xs text-muted-foreground">
                Suggested format:{" "}
                <strong className="text-foreground">
                  {deliverableLabel(trend.deliverable as PlanDeliverable)}
                </strong>
              </p>
              <button
                type="button"
                onClick={() => addToPlan.mutate(trend)}
                disabled={addToPlan.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium btn-primary disabled:opacity-50 w-fit mt-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Plan
              </button>
            </article>
          ))}
        </div>
      )}

      {!scan.isPending && trends.length === 0 && !err && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Hit <strong>Scan latest trends</strong> to fetch what&apos;s new in the field.
        </p>
      )}

      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => toggleExpanded(false)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="w-4 h-4" />
          Collapse trend scanner
        </button>
      </div>
    </section>
  );
}

function safeFormat(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return "just now";
  }
}
