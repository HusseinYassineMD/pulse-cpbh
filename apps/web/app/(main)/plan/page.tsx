"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Lightbulb,
  Mail,
  Plus,
  Trash2,
  X,
  ClipboardList,
  ListTodo,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  DEFAULT_PLAN_TEAM,
  THEME_SUGGESTIONS,
  isParkingStatus,
  isQueueStatus,
} from "@/lib/plan-team";
import type { ContentFormat, ContentIdea, IdeaStatus } from "@/lib/types";

const STATUSES: IdeaStatus[] = [
  "idea",
  "approved",
  "in_production",
  "scheduled",
  "published",
  "on_hold",
];

const FORMATS: ContentFormat[] = ["carousel", "story", "text"];

type ViewMode = "split" | "all";

const emptyForm = {
  title: "",
  theme: "",
  format: "carousel" as ContentFormat,
  target_date: "",
  assigneeKey: "",
  customEmail: "",
  status: "idea" as IdeaStatus,
  notes: "",
  notify_assignee: true,
};

function assigneeFromKey(key: string, team: { name: string; email: string }[]) {
  if (!key) return { owner: null as string | null, assignee_email: null as string | null };
  if (key === "__custom__") return { owner: null, assignee_email: null };
  const member = team.find((m) => m.email === key);
  if (!member) return { owner: null, assignee_email: null };
  return { owner: member.name, assignee_email: member.email };
}

export default function PlanPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");

  const { data: team = DEFAULT_PLAN_TEAM } = useQuery({
    queryKey: ["plan-team"],
    queryFn: () => api.plan.team(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["plan"],
    queryFn: () => api.plan.list(),
  });

  const items = data?.items ?? [];

  const filteredItems = useMemo(() => {
    if (viewMode === "split") return items;
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, viewMode, filter]);

  const parkingLot = useMemo(
    () =>
      items
        .filter((i) => isParkingStatus(i.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [items]
  );

  const workQueue = useMemo(() => {
    const priority: Record<string, number> = {
      in_production: 0,
      approved: 1,
      scheduled: 2,
      published: 3,
    };
    return items
      .filter((i) => isQueueStatus(i.status))
      .sort((a, b) => {
        const da = a.target_date ? parseISO(a.target_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.target_date ? parseISO(b.target_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      });
  }, [items]);

  const counts = useMemo(
    () => ({
      total: items.length,
      parking: parkingLot.length,
      queue: workQueue.length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
    }),
    [items, parkingLot.length, workQueue.length]
  );

  const create = useMutation({
    mutationFn: () => {
      const picked =
        form.assigneeKey === "__custom__"
          ? { owner: form.customEmail.split("@")[0] || null, assignee_email: form.customEmail.trim() || null }
          : assigneeFromKey(form.assigneeKey, team);
      return api.plan.create({
        title: form.title.trim(),
        theme: form.theme.trim() || null,
        format: form.format,
        target_date: form.target_date || null,
        owner: picked.owner,
        assignee_email: picked.assignee_email,
        status: form.status,
        notes: form.notes.trim() || null,
        notify_assignee: form.notify_assignee && !!picked.assignee_email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setForm(emptyForm);
      setShowForm(false);
      setError("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add idea"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ContentIdea> & { notify_assignee?: boolean } }) =>
      api.plan.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });

  const notify = useMutation({
    mutationFn: (id: string) => api.plan.notify(id),
    onSuccess: (res) => {
      setNotifyMsg(res.message);
      setTimeout(() => setNotifyMsg(""), 4000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not send email"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.plan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
  });

  const moveToQueue = (id: string) => update.mutate({ id, patch: { status: "approved" } });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content sandbox</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Plan
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Capture ideas in the parking lot, assign owners, email them, then drive production through the work queue.
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

      {notifyMsg && (
        <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-lg">{notifyMsg}</p>
      )}

      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={counts.total} icon={Lightbulb} />
        <StatCard label="Parking lot" value={counts.parking} icon={Lightbulb} accent="muted" />
        <StatCard label="Work queue" value={counts.queue} icon={ListTodo} accent="sky" />
        <StatCard label="Scheduled" value={counts.scheduled} icon={CalendarDays} accent="teal" />
      </div>

      <div className="flex flex-wrap gap-2">
        <ViewTab active={viewMode === "split"} onClick={() => setViewMode("split")}>
          Parking lot + Queue
        </ViewTab>
        <ViewTab active={viewMode === "all"} onClick={() => setViewMode("all")}>
          All items
        </ViewTab>
        {viewMode === "all" &&
          (["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
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
                placeholder="Any title — free text"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Theme">
              <input
                list="theme-suggestions"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                placeholder="Type any theme or pick a suggestion"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
              <datalist id="theme-suggestions">
                {THEME_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
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
            <Field label="Assign to">
              <select
                value={form.assigneeKey}
                onChange={(e) => setForm({ ...form, assigneeKey: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.name} ({m.email})
                  </option>
                ))}
                <option value="__custom__">Other email…</option>
              </select>
            </Field>
            {form.assigneeKey === "__custom__" && (
              <Field label="Email">
                <input
                  type="email"
                  value={form.customEmail}
                  onChange={(e) => setForm({ ...form, customEmail: e.target.value })}
                  placeholder="name@usc.edu"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </Field>
            )}
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
            <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.notify_assignee}
                onChange={(e) => setForm({ ...form, notify_assignee: e.target.checked })}
                className="rounded border-border"
              />
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email assignee when saved
            </label>
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

      {isLoading && <p className="text-muted-foreground text-sm">Loading plan…</p>}

      {!isLoading && viewMode === "split" && (
        <div className="space-y-8">
          <IdeaSection
            title="Parking lot"
            subtitle="Raw ideas and on-hold items — capture anything here"
            icon={Lightbulb}
            empty="No ideas in the parking lot yet"
            ideas={parkingLot}
            team={team}
            onUpdate={(id, patch) => update.mutate({ id, patch })}
            onDelete={(id) => remove.mutate(id)}
            onNotify={(id) => notify.mutate(id)}
            onMoveToQueue={moveToQueue}
            showMoveToQueue
          />
          <IdeaSection
            title="Work queue"
            subtitle="Approved and in-flight content — sorted by target date"
            icon={ListTodo}
            empty="Nothing in the queue — move an idea from the parking lot"
            ideas={workQueue}
            team={team}
            onUpdate={(id, patch) => update.mutate({ id, patch })}
            onDelete={(id) => remove.mutate(id)}
            onNotify={(id) => notify.mutate(id)}
          />
        </div>
      )}

      {!isLoading && viewMode === "all" && (
        <IdeaSection
          title="All plan items"
          subtitle={filter === "all" ? "Every idea across all statuses" : `Filtered: ${filter.replace(/_/g, " ")}`}
          icon={ClipboardList}
          empty="No items match this filter"
          ideas={filteredItems}
          team={team}
          onUpdate={(id, patch) => update.mutate({ id, patch })}
          onDelete={(id) => remove.mutate(id)}
          onNotify={(id) => notify.mutate(id)}
          onMoveToQueue={moveToQueue}
          showMoveToQueue
        />
      )}
    </div>
  );
}

function IdeaSection({
  title,
  subtitle,
  icon: Icon,
  empty,
  ideas,
  team,
  onUpdate,
  onDelete,
  onNotify,
  onMoveToQueue,
  showMoveToQueue,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  empty: string;
  ideas: ContentIdea[];
  team: { name: string; email: string }[];
  onUpdate: (id: string, patch: Partial<ContentIdea> & { notify_assignee?: boolean }) => void;
  onDelete: (id: string) => void;
  onNotify: (id: string) => void;
  onMoveToQueue?: (id: string) => void;
  showMoveToQueue?: boolean;
}) {
  return (
    <div className="pulse-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
        <Icon className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="ml-auto text-sm font-medium tabular-nums text-muted-foreground">{ideas.length}</span>
      </div>
      {ideas.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Title</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Theme</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Target</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Assignee</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Notes</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  team={team}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onNotify={onNotify}
                  onMoveToQueue={onMoveToQueue}
                  showMoveToQueue={showMoveToQueue && isParkingStatus(idea.status)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IdeaRow({
  idea,
  team,
  onUpdate,
  onDelete,
  onNotify,
  onMoveToQueue,
  showMoveToQueue,
}: {
  idea: ContentIdea;
  team: { name: string; email: string }[];
  onUpdate: (id: string, patch: Partial<ContentIdea> & { notify_assignee?: boolean }) => void;
  onDelete: (id: string) => void;
  onNotify: (id: string) => void;
  onMoveToQueue?: (id: string) => void;
  showMoveToQueue?: boolean;
}) {
  const [title, setTitle] = useState(idea.title);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== idea.title) onUpdate(idea.id, { title: trimmed });
  };

  const assigneeValue = idea.assignee_email || "";

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
      <td className="px-4 py-2 min-w-[180px]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-full font-medium bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <input
          defaultValue={idea.theme || ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (idea.theme || "")) onUpdate(idea.id, { theme: v || null });
          }}
          placeholder="Theme"
          className="w-full max-w-[140px] text-xs bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5"
        />
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
        <input
          type="date"
          defaultValue={idea.target_date || ""}
          onChange={(e) => onUpdate(idea.id, { target_date: e.target.value || null })}
          className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
        />
      </td>
      <td className="px-4 py-2">
        <select
          value={assigneeValue}
          onChange={(e) => {
            const email = e.target.value;
            if (!email) {
              onUpdate(idea.id, { owner: null, assignee_email: null });
              return;
            }
            const member = team.find((m) => m.email === email);
            onUpdate(idea.id, { owner: member?.name ?? email, assignee_email: email });
          }}
          className="text-xs border border-border rounded-lg px-2 py-1 bg-background max-w-[160px]"
        >
          <option value="">Unassigned</option>
          {team.map((m) => (
            <option key={m.email} value={m.email}>
              {m.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select
          value={idea.status}
          onChange={(e) => onUpdate(idea.id, { status: e.target.value as IdeaStatus })}
          className="text-xs border border-border rounded-lg px-2 py-1 bg-background capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-muted-foreground max-w-[180px]">
        <input
          defaultValue={idea.notes || ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (idea.notes || "")) onUpdate(idea.id, { notes: v || null });
          }}
          placeholder="—"
          className="w-full text-xs bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 truncate"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          {showMoveToQueue && onMoveToQueue && (
            <button
              onClick={() => onMoveToQueue(idea.id)}
              className="text-primary hover:bg-primary/10 p-1 rounded"
              title="Move to work queue"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {idea.assignee_email && (
            <button
              onClick={() => onNotify(idea.id)}
              className="text-muted-foreground hover:text-primary p-1 rounded"
              title="Email assignee"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(idea.id)}
            className="text-muted-foreground hover:text-red-600 p-1 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
