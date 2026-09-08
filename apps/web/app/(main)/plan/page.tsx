"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Lightbulb,
  Plus,
  Trash2,
  X,
  ClipboardList,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ContentFormat, ContentIdea, IdeaStatus } from "@/lib/types";

const THEMES = [
  "Genetics",
  "Nutrition",
  "Exercise",
  "Mindfulness",
  "Sleep",
  "Social",
  "Heart-brain",
  "Newsletter",
  "Other",
];

const STATUSES: IdeaStatus[] = [
  "idea",
  "approved",
  "in_production",
  "scheduled",
  "published",
  "on_hold",
];

const FORMATS: ContentFormat[] = ["carousel", "story", "text"];

const FILTER_TABS: { label: string; value: IdeaStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Ideas", value: "idea" },
  { label: "Approved", value: "approved" },
  { label: "In production", value: "in_production" },
  { label: "Scheduled", value: "scheduled" },
  { label: "On hold", value: "on_hold" },
];

const emptyForm = {
  title: "",
  theme: "Nutrition",
  format: "carousel" as ContentFormat,
  target_date: "",
  owner: "CPBH",
  status: "idea" as IdeaStatus,
  notes: "",
};

export default function PlanPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["plan", filter],
    queryFn: () => api.plan.list(filter === "all" ? undefined : { status: filter }),
  });

  const create = useMutation({
    mutationFn: () =>
      api.plan.create({
        title: form.title.trim(),
        theme: form.theme,
        format: form.format,
        target_date: form.target_date || null,
        owner: form.owner.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setForm(emptyForm);
      setShowForm(false);
      setError("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add idea"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ContentIdea> }) => api.plan.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.plan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });

  const counts = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: items.length,
      ideas: items.filter((i) => i.status === "idea").length,
      inProgress: items.filter((i) => ["approved", "in_production"].includes(i.status)).length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content sandbox</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Plan
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Drop every post idea here — theme, target date, and status — so you always know what to work on next.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          Add idea
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Total ideas" value={counts.total} icon={Lightbulb} />
        <StatCard label="Backlog" value={counts.ideas} icon={ClipboardList} accent="muted" />
        <StatCard label="In progress" value={counts.inProgress} icon={CalendarDays} accent="sky" />
        <StatCard label="Scheduled" value={counts.scheduled} icon={CalendarDays} accent="teal" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="pulse-card p-5 space-y-4 border-primary/20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">New idea</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="APOE4 myths vs facts"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Theme">
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target date">
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Format">
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm capitalize"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Owner">
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as IdeaStatus })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Slide count, template to use, approval notes…"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </Field>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.title.trim()}
            className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save idea"}
          </button>
        </div>
      )}

      <div className="pulse-card overflow-hidden">
        {isLoading && <p className="p-8 text-muted-foreground text-sm">Loading plan…</p>}
        {!isLoading && data?.items.length === 0 && (
          <div className="p-16 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-gray-200 mb-4" />
            <p className="text-muted-foreground mb-2">No ideas yet</p>
            <p className="text-sm text-muted-foreground">Add your first content idea using the button above</p>
          </div>
        )}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left">
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Idea</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Theme</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Target</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Format</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Notes</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((idea) => (
                  <tr key={idea.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[200px]">{idea.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                        {idea.theme || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {idea.target_date ? format(parseISO(idea.target_date), "MMM d, yyyy") : "TBD"}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{idea.format}</td>
                    <td className="px-4 py-3 text-muted-foreground">{idea.owner || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={idea.status}
                        onChange={(e) =>
                          update.mutate({ id: idea.id, patch: { status: e.target.value as IdeaStatus } })
                        }
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-background capitalize"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" title={idea.notes || ""}>
                      {idea.notes || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => remove.mutate(idea.id)}
                        className="text-muted-foreground hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "muted" | "sky" | "teal";
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-secondary",
    sky: "text-cyan bg-cyan/15",
    teal: "text-teal bg-teal/15",
  };
  return (
    <div className="pulse-card-hover p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[accent]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-sm block ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
