"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Zap, Calendar, Home, LayoutDashboard, Circle, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { IS_DEMO_MODE } from "@/lib/base-path";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Schedule", icon: Calendar },
  { href: "/posts", label: "Posts", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard.get(),
  });

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 sidebar-gradient text-sidebar-foreground flex flex-col shrink-0 border-r border-sidebar-border/60">
        <div className="p-6 border-b border-sidebar-border/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl block leading-tight tracking-tight text-foreground">Pulse</span>
              <span className="text-[10px] text-cardinal font-semibold uppercase tracking-[0.15em]">USC CPBH</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }
                    : undefined
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {dashboard && (
          <div className="p-4 m-4 rounded-2xl bg-white/35 backdrop-blur-sm border border-sidebar-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Overview
              </div>
              <span className="flex items-center gap-1 text-[10px] text-teal font-medium">
                <Circle className="w-2 h-2 fill-teal text-teal animate-pulse-soft" />
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl py-3 px-2 text-center bg-secondary border border-border/60">
                <p className="text-2xl font-bold text-primary">{dashboard.stats.scheduled}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Scheduled</p>
              </div>
              <div className="rounded-xl py-3 px-2 text-center bg-secondary border border-border/60">
                <p className="text-2xl font-bold text-teal">{dashboard.stats.published}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Published</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Center for Personalized
            <br />
            Brain Health · USC
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        {IS_DEMO_MODE && (
          <div className="bg-teal/10 border-b border-teal/20 px-6 py-2.5 flex items-center justify-center gap-2 text-sm text-teal">
            <Globe className="w-4 h-4 shrink-0" />
            <span>
              Live demo preview — sample data only. Commands and publishing run in dry-run mode.
            </span>
          </div>
        )}
        <div className="p-8 lg:p-10 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
