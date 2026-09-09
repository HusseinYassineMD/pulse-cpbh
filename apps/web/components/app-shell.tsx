"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Calendar,
  Home,
  LayoutDashboard,
  Circle,
  Settings,
  ClipboardList,
  LayoutGrid,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { readSidebarOpen, writeSidebarOpen } from "@/lib/sidebar-prefs";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/calendar", label: "Schedule", icon: Calendar },
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobileNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/calendar", label: "Schedule", icon: Calendar },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/plan": "Plan",
  "/pipeline": "Pipeline",
  "/calendar": "Schedule",
  "/board": "Board",
  "/settings": "Settings",
};

function mobilePageTitle(pathname: string): string {
  if (pathname.startsWith("/posts")) return "Post";
  if (pathname.startsWith("/stories")) return "Story";
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path === "/" ? pathname === "/" : pathname.startsWith(path)) return title;
  }
  return "Pulse";
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/board") {
    return (
      pathname.startsWith("/board") ||
      pathname.startsWith("/posts") ||
      pathname.startsWith("/stories")
    );
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSidebarOpen(readSidebarOpen());
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const next = !open;
      writeSidebarOpen(next);
      return next;
    });
  };

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard.get(),
  });

  const showSidebar = mounted && sidebarOpen;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar — slides in/out */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-sidebar-border/60 sidebar-gradient text-sidebar-foreground transition-[width,opacity] duration-300 ease-in-out overflow-hidden ${
          showSidebar ? "w-64 opacity-100" : "w-0 opacity-0 border-r-0"
        }`}
        aria-hidden={!showSidebar}
      >
        <div className="w-64 flex flex-col min-h-screen">
          <ShellBrand />
          <DesktopNav pathname={pathname} />
          {dashboard && <ShellOverview dashboard={dashboard} />}
          <div className="p-3 border-t border-sidebar-border/60">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
              Hide sidebar
            </button>
          </div>
          <ShellFooter />
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-border/80 bg-white/90 backdrop-blur-lg pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base leading-tight block truncate">Pulse</span>
              <span className="text-[10px] text-muted-foreground truncate block">{mobilePageTitle(pathname)}</span>
            </div>
          </Link>
          <Link
            href="/settings"
            className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
              pathname.startsWith("/settings") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
            }`}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Desktop: show sidebar toggle when collapsed */}
        <div className="hidden md:flex sticky top-0 z-20 items-center gap-2 px-4 sm:px-6 md:px-8 lg:px-10 pt-4 pb-0 bg-gradient-to-b from-background via-background to-transparent">
          {!showSidebar && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-white/80 backdrop-blur hover:bg-secondary shadow-sm transition-colors"
              aria-label="Show sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
              Menu
            </button>
          )}
        </div>

        <div
          className={`p-4 sm:p-6 md:px-8 md:pb-8 lg:px-10 lg:pb-10 mx-auto transition-[max-width] duration-300 ${
            showSidebar ? "max-w-6xl pt-2 md:pt-0" : "max-w-[1600px] pt-2"
          }`}
        >
          {children}
        </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {mobileNav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            const shortLabel = href === "/calendar" ? "Schedule" : label;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 min-h-[56px] text-[10px] sm:text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="truncate max-w-[4.5rem]">{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ShellBrand() {
  return (
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
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
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
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ShellOverview({ dashboard }: { dashboard: { stats: { scheduled: number; published: number } } }) {
  return (
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
  );
}

function ShellFooter() {
  return (
    <div className="p-4 border-t border-sidebar-border mt-auto">
      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Center for Personalized
        <br />
        Brain Health · USC
      </p>
    </div>
  );
}
