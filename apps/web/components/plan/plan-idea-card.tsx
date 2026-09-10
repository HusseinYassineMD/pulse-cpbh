"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowRight, CalendarDays, ExternalLink, FileText, Mail, Pencil, Send, Sparkles, Trash2, User } from "lucide-react";
import type { ContentIdea, IdeaStatus } from "@/lib/types";
import { deliverableLabel, isParkingStatus, isQueueStatus, platformLabels } from "@/lib/plan-team";
import { VisibleContent } from "@/components/ui/visible-content";

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
  highlighted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  onMoveToQueue?: () => void;
  onSendToSchedule?: () => void;
  showMoveToQueue?: boolean;
  showSendToSchedule?: boolean;
};

export function PlanIdeaCard({
  idea,
  highlighted,
  onEdit,
  onDelete,
  onEmail,
  onMoveToQueue,
  onSendToSchedule,
  showMoveToQueue,
  showSendToSchedule,
}: Props) {
  const hasEmail = !!idea.assignee_email;

  return (
    <article
      id={`plan-idea-${idea.id}`}
      className={`pulse-card p-4 flex flex-col gap-3 hover:border-primary/20 transition-colors rounded-xl ${
        highlighted ? "ring-2 ring-teal ring-offset-2" : ""
      }`}
    >
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
        <MetaItem icon={Mail} label="Email">
          {idea.assignee_email || "Not set — tap Email below"}
        </MetaItem>
        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Deliverable</span>
          <p className="text-sm mt-0.5">{deliverableLabel(idea.deliverable)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Platform</span>
          <p className="text-sm mt-0.5">{platformLabels(idea.platforms)}</p>
        </div>
      </div>

      {(idea.substack_url || idea.substack_publish_date) && (
        <div className="text-sm border-t border-border/60 pt-2 space-y-1">
          {idea.substack_url && (
            <a
              href={idea.substack_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline truncate max-w-full"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Substack source</span>
            </a>
          )}
          {idea.substack_publish_date && (
            <p className="text-muted-foreground text-xs">
              Published {format(parseISO(idea.substack_publish_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      )}

      {idea.source_files.length > 0 && (
        <div className="text-sm border-t border-border/60 pt-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Source files</span>
          <ul className="mt-1 space-y-0.5">
            {idea.source_files.slice(0, 3).map((f) => (
              <li key={f.filename}>
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-full"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                    <FileText className="w-3 h-3 shrink-0" />
                    {f.name}
                  </span>
                )}
              </li>
            ))}
            {idea.source_files.length > 3 && (
              <li className="text-xs text-muted-foreground">+{idea.source_files.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {idea.notes && (
        <div className="border-t border-border/60 pt-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Notes</span>
          <VisibleContent text={idea.notes} className="mt-1" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
        <Link
          href={`/studio?planId=${idea.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium btn-primary"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Create in Studio
        </Link>
        <ActionBtn
          onClick={onEmail}
          icon={Mail}
          label={hasEmail ? "Email assignee" : "Assign & email"}
          email
        />
        {showMoveToQueue && onMoveToQueue && isParkingStatus(idea.status) && (
          <ActionBtn onClick={onMoveToQueue} icon={ArrowRight} label="Approve" primary />
        )}
        {showSendToSchedule && onSendToSchedule && isQueueStatus(idea.status) && (
          <ActionBtn onClick={onSendToSchedule} icon={Send} label="Send to schedule" primary />
        )}
        <ActionBtn onClick={onEdit} icon={Pencil} label="Edit" />
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
      <p className="text-sm mt-0.5 break-words">{children}</p>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  title,
  primary,
  email,
  danger,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title?: string;
  primary?: boolean;
  email?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
        email
          ? "bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25 font-semibold"
          : primary
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
