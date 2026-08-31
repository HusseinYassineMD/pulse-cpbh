import type { PostStatus } from "@/lib/types";

const styles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-accent/15 text-accent-foreground",
  ready: "bg-secondary text-secondary-foreground",
  in_review: "bg-sky/15 text-foreground",
  approved: "bg-teal-light text-teal",
  scheduled: "bg-cyan/12 text-cyan",
  publishing: "bg-accent/15 text-accent-foreground",
  published: "bg-teal-light text-teal",
  partially_published: "bg-teal-light text-teal",
  failed: "bg-primary/10 text-primary",
  pending: "bg-cyan/12 text-cyan",
  completed: "bg-teal-light text-teal",
  running: "bg-accent/15 text-accent-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.draft}`}
    >
      {label}
    </span>
  );
}
