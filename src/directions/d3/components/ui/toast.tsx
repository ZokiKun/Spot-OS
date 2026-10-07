"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/directions/d3/lib/utils";

type Toast = { id: number; title: string; description?: string; tone?: "default" | "error" | "success" };
type ToastApi = { show: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi | null>(null);
let counter = 0;
const noopSubscribe = () => () => {};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++counter;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 3000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext value={api}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-24 left-1/2 md:bottom-6 z-[100] flex -translate-x-1/2 flex-col items-center gap-2" role="status" aria-live="polite">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="anim-bounce flex max-w-[420px] items-start gap-3 rounded-2xl border-2 border-b-4 border-line bg-bg px-4 py-3 text-[14px] text-fg shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                {t.tone === "error" ? (
                  <CircleAlert className="mt-px size-5 shrink-0 text-red" strokeWidth={2.5} />
                ) : t.tone === "success" ? (
                  <CircleCheck className="mt-px size-5 shrink-0 text-green" strokeWidth={2.5} />
                ) : null}
                <div className="min-w-0">
                  <div className="font-extrabold">{t.title}</div>
                  {t.description && <div className={cn("mt-0.5 font-semibold text-fg-2")}>{t.description}</div>}
                </div>
                <button onClick={() => dismiss(t.id)} className="ml-1 rounded-lg p-0.5 text-fg-3 hover:bg-hover" aria-label="Dismiss">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
