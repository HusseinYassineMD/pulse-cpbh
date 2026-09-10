"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Send,
  Eye,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";

const AnalyticsCharts = dynamic(
  () => import("@/components/analytics/analytics-charts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 pulse-card h-64 animate-pulse bg-secondary/50" />
        <div className="pulse-card h-64 animate-pulse bg-secondary/50" />
      </div>
    ),
  }
);
import { platformMix, postsByMonth } from "@/lib/insights";

export default function AnalyticsPage() {
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard.get() });
  const { data: postsData } = useQuery({ queryKey: ["posts"], queryFn: () => api.posts.list({ limit: 100 }) });

  const posts = postsData?.items ?? [];
  const stats = dashboard?.stats;

  const monthly = useMemo(
    () => postsByMonth(posts.map((p) => p.created_at)),
    [posts]
  );

  const platforms = useMemo(
    () =>
      platformMix(
        posts.flatMap((p) => p.variants.map((v) => v.platform))
      ),
    [posts]
  );

  const publishingSlots = useMemo(
    () =>
      posts
        .filter((p) => ["published", "scheduled", "partially_published"].includes(p.status))
        .reduce((sum, p) => sum + p.variants.length, 0),
    [posts]
  );

  function exportSummary() {
    const rows = [
      ["Metric", "Value"],
      ["Publishing slots (variants)", String(publishingSlots)],
      ["Published", String(stats?.published ?? 0)],
      ["Scheduled", String(stats?.scheduled ?? 0)],
      ["Drafts + in review", String((stats?.in_review ?? 0) + (stats?.drafts ?? 0))],
      ["Total posts", String(stats?.total ?? 0)],
      ...monthly.map((m) => [`Posts in ${m.month}`, String(m.count)]),
      ...platforms.map((p) => [`Platform · ${p.name}`, String(p.value)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Performance</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Buffer-style overview — content volume, platform mix, and performance at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={exportSummary}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-border hover:bg-secondary text-sm font-medium shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={Eye} label="Publishing slots" value={String(publishingSlots)} accent="teal" />
        <Metric icon={Send} label="Published" value={String(stats?.published ?? 0)} />
        <Metric icon={Calendar} label="Scheduled" value={String(stats?.scheduled ?? 0)} accent="primary" />
        <Metric icon={TrendingUp} label="In pipeline" value={String((stats?.in_review ?? 0) + (stats?.drafts ?? 0))} />
      </div>

      <AnalyticsCharts monthly={monthly} platforms={platforms} />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "teal" | "primary";
}) {
  const colors =
    accent === "teal"
      ? "bg-teal/15 text-teal"
      : accent === "primary"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  return (
    <div className="pulse-card-hover p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold tabular-nums truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
