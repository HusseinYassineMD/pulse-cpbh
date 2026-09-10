import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const variants = {
  cardinal: {
    icon: "text-teal bg-teal-light",
    value: "text-teal",
  },
  blue: {
    icon: "text-sky bg-sky/10",
    value: "text-sky",
  },
  green: {
    icon: "text-cyan bg-cyan/10",
    value: "text-cyan",
  },
  gold: {
    icon: "text-accent-foreground bg-accent/25",
    value: "text-accent-foreground",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "cardinal",
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: "cardinal" | "blue" | "green" | "gold";
  href?: string;
}) {
  const v = variants[accent];

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${v.icon} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className={`text-3xl font-bold tabular-nums ${v.value}`}>{value}</p>
      </div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-3">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="stat-gradient pulse-card-hover p-5 group block">
        {inner}
      </Link>
    );
  }

  return <div className="stat-gradient pulse-card-hover p-5 group">{inner}</div>;
}
