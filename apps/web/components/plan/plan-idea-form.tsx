"use client";

import { Mail, X } from "lucide-react";
import { THEME_SUGGESTIONS } from "@/lib/plan-team";
import type { ContentFormat, IdeaStatus } from "@/lib/types";

export type PlanFormState = {
  title: string;
  theme: string;
  format: ContentFormat;
  target_date: string;
  assigneeKey: string;
  customEmail: string;
  status: IdeaStatus;
  notes: string;
  notify_assignee: boolean;
};

export const emptyPlanForm: PlanFormState = {
  title: "",
  theme: "",
  format: "carousel",
  target_date: "",
  assigneeKey: "",
  customEmail: "",
  status: "idea",
  notes: "",
  notify_assignee: true,
};

export function ideaToForm(
  idea: {
    title: string;
    theme: string | null;
    format: ContentFormat;
    target_date: string | null;
    assignee_email: string | null;
    status: IdeaStatus;
    notes: string | null;
  },
  team: { name: string; email: string }[]
): PlanFormState {
  const member = team.find((m) => m.email === idea.assignee_email);
  const assigneeKey = member
    ? member.email
    : idea.assignee_email
      ? "__custom__"
      : "";

  return {
    title: idea.title,
    theme: idea.theme || "",
    format: idea.format,
    target_date: idea.target_date || "",
    assigneeKey,
    customEmail: assigneeKey === "__custom__" ? idea.assignee_email || "" : "",
    status: idea.status,
    notes: idea.notes || "",
    notify_assignee: false,
  };
}

type Props = {
  form: PlanFormState;
  setForm: (form: PlanFormState) => void;
  team: { name: string; email: string }[];
  showNotify?: boolean;
  mode?: "create" | "edit";
};

export function PlanIdeaForm({ form, setForm, team, showNotify = true, mode = "edit" }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Title" className="sm:col-span-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Any title — free text"
          className="form-input"
          autoFocus
        />
      </Field>

      <Field label="Theme">
        <input
          list="theme-suggestions"
          value={form.theme}
          onChange={(e) => setForm({ ...form, theme: e.target.value })}
          placeholder="Type any theme"
          className="form-input"
        />
        <datalist id="theme-suggestions">
          {THEME_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>

      <Field label="Format">
        <select
          value={form.format}
          onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}
          className="form-input capitalize"
        >
          <option value="carousel">Carousel</option>
          <option value="story">Story</option>
          <option value="text">Text</option>
        </select>
      </Field>

      <Field label="Target date">
        <div className="flex gap-2">
          <input
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            className="form-input flex-1 min-w-0"
          />
          {form.target_date && (
            <button
              type="button"
              onClick={() => setForm({ ...form, target_date: "" })}
              className="shrink-0 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              title="Clear date"
              aria-label="Clear target date"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Leave empty for TBD</p>
      </Field>

      {mode === "edit" && (
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as IdeaStatus })}
            className="form-input capitalize"
          >
            {(["idea", "approved", "in_production", "scheduled", "published", "on_hold"] as IdeaStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              )
            )}
          </select>
        </Field>
      )}

      {mode === "create" && (
        <p className="sm:col-span-2 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
          New ideas always start in the <strong>parking lot</strong>. Use <strong>Approve</strong> on a card to move
          into the work queue.
        </p>
      )}

      <Field label="Assign to" className="sm:col-span-2">
        <select
          value={form.assigneeKey}
          onChange={(e) => setForm({ ...form, assigneeKey: e.target.value })}
          className="form-input"
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
        <Field label="Email" className="sm:col-span-2">
          <input
            type="email"
            value={form.customEmail}
            onChange={(e) => setForm({ ...form, customEmail: e.target.value })}
            placeholder="name@usc.edu"
            className="form-input"
          />
        </Field>
      )}

      <Field label="Notes" className="sm:col-span-2">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          placeholder="Slide count, template, approval notes…"
          className="form-input resize-y min-h-[80px]"
        />
      </Field>

      {showNotify && (
        <label className="sm:col-span-2 flex items-center gap-3 text-sm cursor-pointer py-1">
          <input
            type="checkbox"
            checked={form.notify_assignee}
            onChange={(e) => setForm({ ...form, notify_assignee: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>Email assignee when saved</span>
        </label>
      )}
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
      <span className="text-muted-foreground font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
