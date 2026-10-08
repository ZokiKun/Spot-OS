"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronsRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { IconButton } from "./button";
import { hasOpenPopover, pressDismissedPopover } from "./popover";

/** Notion "side peek": a right-hand panel for opening a row without leaving the list. */
export function SidePeek({
  open,
  onClose,
  children,
  actions,
  expandHref,
  peekKey,
}: {
  /** What's shown (e.g. the task id). Clicking outside onto something that opens a different item switches instead of closing. */
  peekKey?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  expandHref?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "Escape" && !target.closest("[role=dialog]") && !target.isContentEditable) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click outside closes the panel — unless the press only dismissed a popover, landed in a
  // dialog/toast, or opened another item (checked once the click has fully run).
  const panelRef = useRef<HTMLElement>(null);
  const keyRef = useRef(peekKey);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    keyRef.current = peekKey;
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: { key: string | undefined } | null = null;
    const onDown = (e: PointerEvent) => {
      pending = null;
      const t = e.target as HTMLElement;
      if (pressDismissedPopover(e) || hasOpenPopover() || panelRef.current?.contains(t)) return;
      if (t.closest?.("[role=dialog], [role=status], [data-keep-peek]")) return;
      // Review/comment overlays (e.g. the Vercel toolbar) live in custom elements outside the app.
      if (e.composedPath().some((n) => n instanceof HTMLElement && n.tagName.includes("-"))) return;
      pending = { key: keyRef.current };
    };
    // Decide on the click, after the app's own handlers have run (setTimeout 0).
    const onClick = () => {
      const p = pending;
      pending = null;
      if (p) timer = setTimeout(() => keyRef.current === p.key && closeRef.current(), 0);
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <aside ref={panelRef} className="anim-peek fixed inset-y-0 right-0 z-30 flex w-full max-w-[max(560px,34vw)] flex-col border-l border-line bg-bg shadow-[rgba(15,15,15,0.04)_0_0_0_1px,rgba(15,15,15,0.03)_0_3px_6px,rgba(15,15,15,0.06)_0_9px_24px]">
      <div className="flex h-11 shrink-0 items-center gap-1 px-3">
        <IconButton label="Close" onClick={onClose}>
          <ChevronsRight className="size-4" />
        </IconButton>
        {expandHref && (
          <Link href={expandHref} className="inline-flex size-6 items-center justify-center rounded-md text-fg-2 hover:bg-hover" title="Open as page">
            <Maximize2 className="size-3.5" />
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-16 pt-6 max-sm:px-5">{children}</div>
    </aside>,
    document.body,
  );
}
