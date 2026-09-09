"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Mail, Paperclip, Trash2, X } from "lucide-react";
import {
  DELIVERABLE_OPTIONS,
  PLATFORM_OPTIONS,
} from "@/lib/plan-team";
import { suggestCategories } from "@/lib/plan-categories";
import type { IdeaStatus, PlanDeliverable, PlanPlatform, PlanSourceFile } from "@/lib/types";

export type PlanFormState = {
  title: string;
  theme: string;
  deliverable: PlanDeliverable;
  platforms: PlanPlatform[];
  target_date: string;
  assigneeKey: string;
  customEmail: string;
  status: IdeaStatus;
  notes: string;
  substack_url: string;
  substack_publish_date: string;
  notify_assignee: boolean;
};

export const emptyPlanForm: PlanFormState = {
  title: "",
  theme: "",
  deliverable: "post",
  platforms: [],
  target_date: "",
  assigneeKey: "",
  customEmail: "",
  status: "idea",
  notes: "",
  substack_url: "",
  substack_publish_date: "",
  notify_assignee: true,
};

export function ideaToForm(
  idea: {
    title: string;
    theme: string | null;
    deliverable?: PlanDeliverable | null;
    format?: string;
    platforms?: PlanPlatform[];
    target_date: string | null;
    assignee_email: string | null;
    status: IdeaStatus;
    notes: string | null;
    substack_url?: string | null;
    substack_publish_date?: string | null;
  },
  team: { name: string; email: string }[]
): PlanFormState {
  const member = team.find((m) => m.email === idea.assignee_email);
  const assigneeKey = member
    ? member.email
    : idea.assignee_email
      ? "__custom__"
      : "";

  let deliverable = idea.deliverable;
  if (!deliverable) {
    if (idea.format === "story") deliverable = "story";
    else if (idea.format === "text") deliverable = "caption";
    else deliverable = "post";
  }

  return {
    title: idea.title,
    theme: idea.theme || "",
    deliverable,
    platforms: idea.platforms ?? [],
    target_date: idea.target_date || "",
    assigneeKey,
    customEmail: assigneeKey === "__custom__" ? idea.assignee_email || "" : "",
    status: idea.status,
    notes: idea.notes || "",
    substack_url: idea.substack_url || "",
    substack_publish_date: idea.substack_publish_date || "",
    notify_assignee: false,
  };
}

type Props = {
  form: PlanFormState;
  setForm: (form: PlanFormState) => void;
  team: { name: string; email: string }[];
  showNotify?: boolean;
  mode?: "create" | "edit";
  sourceFiles?: PlanSourceFile[];
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  onUpload?: (files: FileList) => void;
  onRemoveFile?: (filename: string) => void;
  uploading?: boolean;
};

export function PlanIdeaForm({
  form,
  setForm,
  team,
  showNotify = true,
  mode = "edit",
  sourceFiles = [],
  pendingFiles = [],
  onPendingFilesChange,
  onUpload,
  onRemoveFile,
  uploading = false,
}: Props) {
  const togglePlatform = (platform: PlanPlatform) => {
    const next = form.platforms.includes(platform)
      ? form.platforms.filter((p) => p !== platform)
      : [...form.platforms, platform];
    setForm({ ...form, platforms: next });
  };

  const hasAssignee =
    form.assigneeKey !== "" &&
    (form.assigneeKey !== "__custom__" || form.customEmail.trim().length > 0);

  const showSubstack = form.deliverable === "post" || form.deliverable === "newsletter";

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Topic" className="sm:col-span-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="What is this content about?"
          className="form-input"
          autoFocus
        />
      </Field>

      <Field label="Category">
        <CategoryInput
          value={form.theme}
          onChange={(theme) => setForm({ ...form, theme })}
        />
      </Field>

      <Field label="Deliverable">
        <select
          value={form.deliverable}
          onChange={(e) => setForm({ ...form, deliverable: e.target.value as PlanDeliverable })}
          className="form-input"
        >
          {DELIVERABLE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Platform" className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => {
            const active = form.platforms.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Select one or more platforms</p>
      </Field>

      {showSubstack && (
        <>
          <Field label="Substack source link">
            <input
              type="url"
              value={form.substack_url}
              onChange={(e) => setForm({ ...form, substack_url: e.target.value })}
              placeholder="https://yourname.substack.com/p/..."
              className="form-input"
            />
          </Field>

          <Field label="Substack publish date">
            <div className="flex gap-2">
              <input
                type="date"
                value={form.substack_publish_date}
                onChange={(e) => setForm({ ...form, substack_publish_date: e.target.value })}
                className="form-input flex-1 min-w-0"
              />
              {form.substack_publish_date && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, substack_publish_date: "" })}
                  className="shrink-0 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Clear date"
                  aria-label="Clear Substack publish date"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
        </>
      )}

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

      <Field label="Assign to (for email notifications)" className="sm:col-span-2">
        <select
          value={form.assigneeKey}
          onChange={(e) => {
            const assigneeKey = e.target.value;
            setForm({
              ...form,
              assigneeKey,
              notify_assignee: assigneeKey !== "",
            });
          }}
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
            placeholder="name@example.com"
            className="form-input"
          />
        </Field>
      )}

      {showNotify && hasAssignee && (
        <div className="sm:col-span-2 rounded-xl border border-teal/20 bg-teal/5 p-4 space-y-2">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.notify_assignee}
              onChange={(e) => setForm({ ...form, notify_assignee: e.target.checked })}
              className="w-4 h-4 rounded border-border mt-0.5 shrink-0"
            />
            <div className="space-y-1">
              <span className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal shrink-0" />
                Send assignment email now
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sends to the person you picked above — topic, category, deliverable, platforms, dates,
                files, and notes. Check this, then click <strong>Add idea</strong> at the bottom.
              </p>
            </div>
          </label>
        </div>
      )}

      {showNotify && !hasAssignee && (
        <p className="sm:col-span-2 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
          Pick someone under <strong>Assign to</strong> to unlock the email option.
        </p>
      )}

      <Field label="Source files" className="sm:col-span-2">
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border cursor-pointer hover:bg-secondary/50 transition-colors">
          <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading…" : "Attach PDF, Word, images, slides…"}
          </span>
          <input
            type="file"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              if (mode === "create" && onPendingFilesChange) {
                onPendingFilesChange([...pendingFiles, ...Array.from(files)]);
              } else if (onUpload) {
                onUpload(files);
              }
              e.target.value = "";
            }}
          />
        </label>

        {(sourceFiles.length > 0 || pendingFiles.length > 0) && (
          <ul className="mt-2 space-y-1.5">
            {sourceFiles.map((f) => (
              <li
                key={f.filename}
                className="flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded-md bg-secondary/60"
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0 text-primary hover:underline"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </a>
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(f.filename)}
                    className="shrink-0 p-1 text-muted-foreground hover:text-red-600"
                    aria-label={`Remove ${f.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
            {pendingFiles.map((f, i) => (
              <li
                key={`pending-${f.name}-${i}`}
                className="flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded-md bg-amber-50 border border-amber-100"
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  {f.name}
                  <span className="text-[10px] text-amber-700 uppercase">pending save</span>
                </span>
                {onPendingFilesChange && (
                  <button
                    type="button"
                    onClick={() => onPendingFilesChange(pendingFiles.filter((_, j) => j !== i))}
                    className="shrink-0 p-1 text-muted-foreground hover:text-red-600"
                    aria-label={`Remove ${f.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Notes" className="sm:col-span-2">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          placeholder="Slide count, template, approval notes…"
          className="form-input resize-y min-h-[80px]"
        />
      </Field>
    </div>
  );
}

function CategoryInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => suggestCategories(value), [value]);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const showList = open && suggestions.length > 0 && value.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && suggestions[highlight]) {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Type any category — learns as you go"
        className="form-input"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
      />
      {showList && (
        <ul
          className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg py-1 max-h-48 overflow-auto"
          role="listbox"
        >
          {suggestions.map((option, i) => (
            <li key={option} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(option)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary ${
                  i === highlight ? "bg-secondary/80" : ""
                }`}
              >
                {highlightMatch(option, value.trim())}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">
        Remembers categories you&apos;ve used — type a few letters to see suggestions.
      </p>
    </div>
  );
}

function highlightMatch(option: string, query: string) {
  if (!query) return option;
  const idx = option.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return option;
  return (
    <>
      {option.slice(0, idx)}
      <span className="font-semibold text-primary">{option.slice(idx, idx + query.length)}</span>
      {option.slice(idx + query.length)}
    </>
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
