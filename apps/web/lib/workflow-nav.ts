import type { LucideIcon } from "lucide-react";
import { Calendar, ClipboardCheck, Lightbulb, Send } from "lucide-react";

export type WorkflowNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Requires team code (Tiffany / lead). Students see a lock and go to /team. */
  leadOnly: boolean;
};

/** Same four tabs for everyone — lead-only routes are locked until team sign-in. */
export const WORKFLOW_NAV: WorkflowNavItem[] = [
  { href: "/ideate", label: "Ideation", shortLabel: "Ideate", icon: Lightbulb, leadOnly: false },
  { href: "/submit", label: "Send draft", shortLabel: "Send", icon: Send, leadOnly: false },
  { href: "/review", label: "Review", shortLabel: "Review", icon: ClipboardCheck, leadOnly: true },
  { href: "/calendar", label: "Schedule", shortLabel: "Schedule", icon: Calendar, leadOnly: true },
];
