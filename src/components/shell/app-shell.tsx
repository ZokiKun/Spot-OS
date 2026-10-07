"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TopNav, MobileDock } from "./top-nav";
import { CommandPalette } from "./command-palette";
import { ShellContext } from "./shell-context";
import { useTheme } from "./theme";
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
  const shell = useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <ShellContext value={shell}>
      <TaskPeekProvider>
        <div className="flex min-h-dvh flex-col bg-bg">
          <TopNav />
          <div className="min-w-0 flex-1 pb-28 md:pb-0">{children}</div>
          <MobileDock />
        </div>
      </TaskPeekProvider>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ShellContext>
  );
}
