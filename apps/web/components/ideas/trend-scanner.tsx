"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Globe, Plus, Radar, RefreshCw, Sparkles, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { isStaticMode } from "@/lib/base-path";
import { getInstantTrendsPreview, scanBrainHealthTrends } from "@/lib/trends-scan";
import { deliverableLabel } from "@/lib/plan-team";
import type { TrendItem, TrendScanResponse } from "@/lib/trends-types";
import type { PlanDeliverable } from "@/lib/types";

const TRENDS_OPEN_KEY = "pulse-trends-scanner-open";
const API_TRENDS_TIMEOUT_MS = 5500;

function readTrendsOpen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TRENDS_OPEN_KEY) !== "closed";
}

function writeTrendsOpen(open: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRENDS_OPEN_KEY, open ? "open" : "closed");
}

type TrendScannerProps = {
  /** Left rail on Plan/Ideas — always-visible hot topics list */
  layout?: "default" | "sidebar";
};

export function TrendScanner({ layout = "default" }: TrendScannerProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [feedProgress, setFeedProgress] = useState<{ done: number; total: number } | null>(null);
  const sidebarAutoScan = useRef(false);
  const fullScanStarted = useRef(false);

  const applyScanResult = useCallback((data: TrendScanResponse) => {
    setTrends(data.items);
    setSources(data.sources_checked);
    setScannedAt(data.scanned_at);
    if (data.sources_checked?.includes("CPBH curated") && data.sources_checked.length === 1) {
      setMsg("Live headlines unavailable — showing curated brain-health starters.");
      setTimeout(() => setMsg(""), 6000);
    }
  }, []);

  const clientScan = useCallback(
    (opts?: { force?: boolean; fast?: boolean; bypassCache?: boolean }) =>
      scanBrainHealthTrends(16, {
        force: opts?.force,
        fast: opts?.fast,
        bypassCache: opts?.bypassCache,
        onProgress: (p) => {
          setTrends(p.items);
          setSources(p.sources_checked);
          setFeedProgress({ done: p.feeds_done, total: p.feeds_total });
        },
      }),
    []
  );

  const scan = useMutation({
    mutationFn: async (opts?: { force?: boolean; preferClient?: boolean }) => {
      const force = opts?.force === true;
      const preferClient = opts?.preferClient === true || layout === "sidebar";

      const runClient = (fast?: boolean) => clientScan({ force, fast });

      const queueFullClientScan = () => {
        if (fullScanStarted.current) return;
        fullScanStarted.current = true;
        void clientScan({ bypassCache: true, fast: false }).then((data) => {
          if (data.items.length) applyScanResult(data);
          setFeedProgress(null);
        });
      };

      if (preferClient || isStaticMode()) {
        const fastResult = await runClient(true);
        queueFullClientScan();
        return fastResult;
      }

      try {
        const apiResult = await Promise.race([
          api.trends.scan({ limit: 12, force }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Trends API timed out")), API_TRENDS_TIMEOUT_MS)
          ),
        ]);
        return apiResult;
      } catch {
        const fallback = await runClient(true);
        if (fallback.items.length === 0) throw new Error("Could not load trends");
        queueFullClientScan();
        return fallback;
      }
    },
    onSuccess: (data) => {
      applyScanResult(data);
      setFeedProgress(null);
      setErr("");
    },
    onError: (e) => {
      setFeedProgress(null);
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not scan trends");
    },
  });

  useEffect(() => {
    setExpanded(readTrendsOpen());
    setMounted(true);
    const instant = getInstantTrendsPreview(16);
    setTrends(instant.items);
    setSources(instant.sources_checked);
    setScannedAt(instant.scanned_at);
  }, []);

  useEffect(() => {
    if (!mounted || layout !== "sidebar" || sidebarAutoScan.current) return;
    sidebarAutoScan.current = true;
    setFeedProgress({ done: 0, total: 2 });
    scan.mutate({ force: false, preferClient: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when sidebar mounts
  }, [mounted, layout]);

  function handleScan() {
    setErr("");
    setMsg("");
    setFeedProgress({ done: 0, total: layout === "sidebar" ? 2 : 4 });
    fullScanStarted.current = false;
    scan.mutate({ force: true, preferClient: layout === "sidebar" });
  }

  const toggleExpanded = (open: boolean) => {
    setExpanded(open);
    writeTrendsOpen(open);
  };

  const addToPlan = useMutation({
    mutationFn: (trend: TrendItem) =>
      api.plan.create({
        title: trend.title.slice(0, 200),
        theme: trend.theme,
        deliverable: trend.deliverable,
        notes: [
          trend.suggested_hook,
          trend.summary ? `\nSummary: ${trend.summary}` : "",
          trend.published_at ? `\nPublished: ${trend.published_at}` : "",
          `\nSource: ${trend.source}`,
          trend.url,
        ].join("\n"),
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

  if (!mounted) {
    if (layout === "sidebar") {
      return (
        <section className="pulse-card border border-teal/20 p-4 min-h-[12rem] animate-pulse bg-muted/30" aria-hidden>
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        </section>
      );
    }
    return null;
  }

  const isRefreshing = scan.isPending && trends.length > 0;

  if (layout === "sidebar") {
    return (
      <section className="pulse-card border border-teal/20 bg-gradient-to-b from-teal/[0.05] to-white overflow-hidden flex flex-col max-h-[min(32rem,70dvh)] lg:max-h-[calc(100dvh-8rem)]">
        <div className="p-4 border-b border-border/60 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5" />
                Hot topics
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Brain-health headlines — add any to the parking lot.
              </p>
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={scan.isPending}
              className="p-2 rounded-lg border border-teal/25 text-teal hover:bg-teal/10 disabled:opacity-50 shrink-0"
              aria-label="Refresh hot topics"
            >
              <RefreshCw className={`w-4 h-4 ${scan.isPending ? "animate-spin" : ""}`} />
            </button>
          </div>
          {msg && <p className="text-xs text-teal-900 bg-teal/10 border border-teal/25 px-2 py-1.5 rounded-lg">{msg}</p>}
          {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1.5 rounded-lg">{err}</p>}
          {(scannedAt || trends.length > 0) && (
            <p className="text-[10px] text-muted-foreground">
              {trends.length} topics
              {isRefreshing && feedProgress
                ? ` · updating ${feedProgress.done}/${feedProgress.total}…`
                : scannedAt
                  ? ` · ${safeFormat(scannedAt)}`
                  : ""}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[8rem]">
          {scan.isPending && trends.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Scanning sources…</p>
          )}
          {!scan.isPending && trends.length === 0 && (
            <button
              type="button"
              onClick={handleScan}
              className="w-full text-xs font-medium py-2.5 rounded-lg border border-dashed border-teal/30 text-teal hover:bg-teal/5"
            >
              {err ? "Retry hot topics" : "Load hot topics"}
            </button>
          )}
          {trends.map((trend) => (
            <article key={trend.id} className="rounded-xl border border-border/80 bg-white/80 p-3 space-y-2">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-teal">{trend.source}</span>
                <a
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-0.5"
                  aria-label="Open article"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <h3 className="text-xs font-semibold leading-snug line-clamp-3">{trend.title}</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-2 italic">{trend.suggested_hook}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => addToPlan.mutate(trend)}
                  disabled={addToPlan.isPending}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/15 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  Add to Plan
                </button>
                <Link
                  href={`/studio?title=${encodeURIComponent(trend.title.slice(0, 200))}&sourceText=${encodeURIComponent(
                    [trend.suggested_hook, trend.summary, `Source: ${trend.source}`, trend.url].filter(Boolean).join("\n\n")
                  )}`}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium border border-border hover:bg-secondary"
                >
                  <Sparkles className="w-3 h-3" />
                  Studio
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

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
                Scans <strong>all four sources</strong> (Google News ×2, BBC Health, MedlinePlus), filters for
                brain-health relevance, and ranks by publish date. Add any hit to Plan to start your workflow.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={scan.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium btn-primary disabled:opacity-50 shrink-0"
          >
            {scan.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {feedProgress
                  ? `Scanning ${feedProgress.done}/${feedProgress.total} sources…`
                  : "Scanning…"}
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
            {trends.length} result{trends.length === 1 ? "" : "s"} · Last scan {safeFormat(scannedAt)}
            {sources.length > 0 && ` · ${sources.join(" · ")}`}
          </p>
        )}
      </div>

      {scan.isPending && trends.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pulse-card h-48 animate-pulse bg-gray-100/80 rounded-2xl" />
          ))}
        </div>
      )}

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
              <h3 className="font-semibold text-sm leading-snug">{trend.title}</h3>
              {trend.published_at && (
                <p className="text-[11px] text-muted-foreground">
                  Published {safeFormat(trend.published_at)}
                </p>
              )}
              {trend.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed">{trend.summary}</p>
              )}
              <p className="text-xs text-muted-foreground italic border-l-2 border-teal/30 pl-2 leading-relaxed">
                {trend.suggested_hook}
              </p>
              <p className="text-xs text-muted-foreground">
                Suggested format:{" "}
                <strong className="text-foreground">
                  {deliverableLabel(trend.deliverable as PlanDeliverable)}
                </strong>
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <Link
                  href={`/studio?title=${encodeURIComponent(trend.title.slice(0, 200))}&sourceText=${encodeURIComponent(
                    [trend.suggested_hook, trend.summary, `Source: ${trend.source}`, trend.url].filter(Boolean).join("\n\n")
                  )}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium btn-primary"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create now
                </Link>
                <button
                  type="button"
                  onClick={() => addToPlan.mutate(trend)}
                  disabled={addToPlan.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-border bg-white hover:bg-secondary disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Plan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!scan.isPending && trends.length === 0 && !err && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Tap <strong>Scan latest trends</strong> to fetch live headlines right now.
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
