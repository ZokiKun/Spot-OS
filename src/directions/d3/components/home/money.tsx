"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { readPref, writePref } from "@/directions/d3/lib/hooks";
import { formatMoney } from "@/directions/d3/lib/utils";
import { Button } from "@/directions/d3/components/ui/button";

const listeners = new Set<() => void>();
const KEY = "finance-visible";

/** Finance values are hidden by default on every device (shoulder-surfing in a studio). */
export function useMoneyVisible() {
  const visible = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => readPref(KEY, false),
    () => false,
  );
  const setVisible = (v: boolean) => {
    writePref(KEY, v);
    listeners.forEach((l) => l());
  };
  return { visible, setVisible };
}

export function Money({ value, currency, compact }: { value: number | null | undefined; currency: string; compact?: boolean }) {
  const { visible } = useMoneyVisible();
  if (!visible) return <span className="select-none tracking-[0.12em] text-fg-3" aria-label="Hidden amount">•••••</span>;
  return <>{formatMoney(value, currency, compact)}</>;
}

export function RevealToggle() {
  const { visible, setVisible } = useMoneyVisible();
  return (
    <Button variant="ghost" onClick={() => setVisible(!visible)} aria-pressed={visible}>
      {visible ? <EyeOff className="size-4" strokeWidth={3} /> : <Eye className="size-4" strokeWidth={3} />}
      {visible ? "Hide amounts" : "Show amounts"}
    </Button>
  );
}
