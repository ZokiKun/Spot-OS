"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { ShellContext } from "./shell-context";
import { useTheme } from "./theme";
import { TaskPeekProvider } from "@/components/tasks/task-peek";
import { NotificationWatcher } from "./inbox";

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
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
      <div className="flex h-dvh overflow-hidden">
        <aside className="no-print hidden w-60 shrink-0 border-r border-line md:block">
          <Sidebar />
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
      </TaskPeekProvider>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationWatcher />
    </ShellContext>
  );
}
