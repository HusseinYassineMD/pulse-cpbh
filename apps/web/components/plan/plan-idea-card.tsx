"use client";

import { format, parseISO } from "date-fns";
import { ArrowRight, CalendarDays, Mail, Pencil, Trash2, User } from "lucide-react";
import type { ContentIdea, IdeaStatus } from "@/lib/types";
import { isParkingStatus } from "@/lib/plan-team";

const STATUS_COLORS: Record<IdeaStatus, string> = {
  idea: "bg-secondary text-muted-foreground",
  approved: "bg-sky-100 text-sky-800",
  in_production: "bg-amber-100 text-amber-800",
  scheduled: "bg-teal-100 text-teal-800",
  published: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-600",
};

type Props = {
  idea: ContentIdea;
  onEdit: () => void;
  onDelete: () => void;
  onNotify: () => void;
  onMoveToQueue?: () => void;
  showMoveToQueue?: boolean;
};

export function PlanIdeaCard({ idea, onEdit, onDelete, onNotify, onMoveToQueue, showMoveToQueue }: Props) {
  return (
    <article className="pulse-card p-4 flex flex-col gap-3 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base leading-snug break-words">{idea.title}</h3>
          {idea.theme && (
            <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {idea.theme}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[idea.status]}`}
        >
          {idea.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <MetaItem icon={CalendarDays} label="Target">
          {idea.target_date ? format(parseISO(idea.target_date), "MMM d, yyyy") : "TBD"}
        </MetaItem>
        <MetaItem icon={User} label="Assignee">
          {idea.owner || "Unassigned"}
        </MetaItem>
        <div className="col-span-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Format</span>
          <p className="capitalize text-sm mt-0.5">{idea.format}</p>
        </div>
      </div>

      {idea.notes && (
        <p className="text-sm text-muted-foreground line-clamp-2 border-t border-border/60 pt-2">{idea.notes}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
        {showMoveToQueue && onMoveToQueue && isParkingStatus(idea.status) && (
          <ActionBtn onClick={onMoveToQueue} icon={ArrowRight} label="Approve" primary />
        )}
        <ActionBtn onClick={onEdit} icon={Pencil} label="Edit" primary={!showMoveToQueue} />
        {idea.assignee_email && <ActionBtn onClick={onNotify} icon={Mail} label="Email" />}
        <ActionBtn onClick={onDelete} icon={Trash2} label="Delete" danger />
      </div>
    </article>
  );
}

function MetaItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-sm mt-0.5 truncate">{children}</p>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  primary,
  danger,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : danger
            ? "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
            : "bg-secondary text-foreground hover:bg-secondary/80 border border-border/60"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
