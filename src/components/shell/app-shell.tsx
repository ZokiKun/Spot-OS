"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { ShellContext } from "./shell-context";
import { useTheme } from "./theme";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";
import { TaskPeekProvider } from "@/components/tasks/task-peek";

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  useTheme(); // keeps data-theme in sync with the stored preference

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const noop = useCallback(() => {}, []);
  const shell = useMemo(() => ({ openSearch, openMobileNav: noop, closeMobileNav: noop, mobileNavOpen: false }), [openSearch, noop]);

  return (
    <ShellContext value={shell}>
      <TaskPeekProvider>
        <div className="flex h-dvh overflow-hidden">
          <aside className="no-print hidden w-[88px] shrink-0 border-r-2 border-line md:block lg:w-64">
            <Sidebar />
          </aside>
          <div className="min-w-0 flex-1 overflow-y-auto" id="main-scroll">
            <MobileTopBar />
            {children}
          </div>
        </div>
        <MobileTabBar />
      </TaskPeekProvider>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ShellContext>
  );
}
