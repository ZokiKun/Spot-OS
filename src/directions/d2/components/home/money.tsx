"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { readPref, writePref } from "@/directions/d2/lib/hooks";
import { formatMoney } from "@/directions/d2/lib/utils";
import { PillButton } from "@/directions/d2/components/ui/chunk";

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
  if (!visible) return <span className="select-none tracking-[0.12em] opacity-50" aria-label="Hidden amount">••••</span>;
  return <>{formatMoney(value, currency, compact)}</>;
}

export function RevealToggle() {
  const { visible, setVisible } = useMoneyVisible();
  return (
    <PillButton tone="surface" onClick={() => setVisible(!visible)} aria-pressed={visible}>
      {visible ? <EyeOff /> : <Eye />}
      {visible ? "Hide amounts" : "Show amounts"}
    </PillButton>
  );
}
