"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  GitBranch,
  Home,
  LayoutGrid,
  Lightbulb,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

const OPEN_EVENT = "pulse:open-command-palette";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  group: "Navigate" | "Create";
};

export function CommandPaletteTrigger({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
      className={`inline-flex items-center gap-2 rounded-xl text-sm border border-border bg-white/80 backdrop-blur hover:bg-secondary shadow-sm transition-colors text-muted-foreground ${
        compact ? "p-2.5 min-w-[44px] min-h-[44px] justify-center" : "px-3 py-2"
      } ${className}`}
      aria-label="Open command palette"
    >
      <Search className="w-4 h-4 shrink-0" />
      {!compact && (
        <>
          <span className="hidden sm:inline">Quick find</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
            ⌘K
          </kbd>
        </>
      )}
    </button>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const items: CommandItem[] = useMemo(
    () => [
      { id: "home", label: "Home", icon: Home, action: () => go("/"), group: "Navigate" },
      { id: "ideas", label: "Ideas", hint: "Trends & content starters", icon: Lightbulb, action: () => go("/ideas"), group: "Navigate" },
      { id: "studio", label: "Create Studio", hint: "Paste, generate, chat, schedule", icon: Sparkles, action: () => go("/studio"), group: "Navigate" },
      { id: "plan", label: "Plan", hint: "Content calendar & ideas", icon: ClipboardList, action: () => go("/plan"), group: "Navigate" },
      { id: "pipeline", label: "Pipeline", hint: "Source → highlights → outputs", icon: GitBranch, action: () => go("/pipeline"), group: "Navigate" },
      { id: "calendar", label: "Schedule", hint: "Publishing queue", icon: Calendar, action: () => go("/calendar"), group: "Navigate" },
      { id: "board", label: "Board", hint: "Posts & stories", icon: LayoutGrid, action: () => go("/board"), group: "Navigate" },
      { id: "analytics", label: "Analytics", hint: "Performance overview", icon: BarChart3, action: () => go("/analytics"), group: "Navigate" },
      { id: "settings", label: "Settings", icon: Settings, action: () => go("/settings"), group: "Navigate" },
      { id: "new-post", label: "New post", icon: Plus, action: () => go("/posts/new"), group: "Create" },
      { id: "new-story", label: "New story", icon: Sparkles, action: () => go("/stories/new"), group: "Create" },
    ],
    [go]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const openPalette = () => {
      setOpen(true);
      setQuery("");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, openPalette);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_EVENT, openPalette);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex]);

  if (!open) return null;

  const groups = ["Navigate", "Create"] as const;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] sm:top-[12%] z-50 w-[min(100%-2rem,32rem)] -translate-x-1/2 pulse-card shadow-2xl overflow-hidden animate-fade-up max-h-[min(85vh,32rem)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page or create content…"
            aria-label="Search pages and actions"
            className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted-foreground min-h-[44px]"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hidden sm:inline">esc</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto overscroll-contain py-2 flex-1" role="listbox" aria-label="Results">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">No matches</li>
          )}
          {groups.map((group) => {
            const groupItems = filtered.filter((i) => i.group === group);
            if (!groupItems.length) return null;
            return (
              <li key={group}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <ul>
                  {groupItems.map((item) => {
                    const idx = filtered.indexOf(item);
                    const Icon = item.icon;
                    const active = idx === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={item.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-left transition-colors touch-manipulation ${
                            active ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
                          <span className="font-medium flex-1">{item.label}</span>
                          {item.hint && (
                            <span className="text-xs text-muted-foreground truncate max-w-[40%] hidden sm:inline">
                              {item.hint}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
