"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { ShellContext } from "./shell-context";
import { useTheme } from "./theme";
import { TaskPeekProvider } from "@/components/tasks/task-peek";
import { TaskSelectionProvider } from "@/components/tasks/task-selection";
import { NotificationWatcher } from "./inbox";
import { markPopState, recordVisit } from "./nav-history";
import { QuickAddProvider } from "./quick-add";
import { VoiceTyping } from "./voice-typing";
import { usePref } from "@/lib/hooks";
import { SIDEBAR_COLLAPSED_PREF } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = usePref(SIDEBAR_COLLAPSED_PREF, false);
  const toggleCollapsed = useCallback(() => setCollapsed(!collapsed), [setCollapsed, collapsed]);
  const pathname = usePathname();
  useTheme(); // keeps data-theme in sync with the stored preference

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      // ⌘\ — collapse / expand the sidebar (as in Notion).
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  useEffect(() => {
    window.addEventListener("popstate", markPopState);
    return () => window.removeEventListener("popstate", markPopState);
  }, []);
  useEffect(() => recordVisit(pathname), [pathname]);

  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setMobileNavOpen(false);
  }

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const shell = useMemo(
    () => ({ openSearch, openMobileNav, closeMobileNav, mobileNavOpen }),
    [openSearch, openMobileNav, closeMobileNav, mobileNavOpen],
  );

  return (
    <ShellContext value={shell}>
      <TaskPeekProvider>
      <TaskSelectionProvider>
      <QuickAddProvider>
      <div className="flex h-dvh overflow-hidden">
        <aside className={cn("no-print hidden shrink-0 border-r border-line transition-[width] duration-150 md:block", collapsed ? "w-[52px]" : "w-60")}>
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </aside>
        {mobileNavOpen && (
          <div className="anim-fade fixed inset-0 z-40 bg-[rgba(15,15,15,0.4)] md:hidden" onClick={closeMobileNav}>
            <aside className={cn("h-full w-72 max-w-[85vw] shadow-menu")} onClick={(e) => e.stopPropagation()}>
              <Sidebar />
            </aside>
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-y-auto" id="main-scroll">
          {children}
        </div>
      </div>
      </QuickAddProvider>
      </TaskSelectionProvider>
      </TaskPeekProvider>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationWatcher />
      <VoiceTyping />
    </ShellContext>
  );
}
