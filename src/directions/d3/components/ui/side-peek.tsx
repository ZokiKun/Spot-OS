"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import Link from "next/link";
import { IconButton } from "./button";

/** Notion "side peek": a right-hand panel for opening a row without leaving the list. */
export function SidePeek({
  open,
  onClose,
  children,
  actions,
  expandHref,
}: {
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

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <aside className="anim-peek fixed inset-y-0 right-0 z-30 flex w-full max-w-[520px] flex-col border-l-2 border-line bg-bg shadow-[-12px_0_32px_rgba(0,0,0,0.08)] sm:inset-y-3 sm:right-3 sm:rounded-3xl sm:border-2">
      <div className="flex h-14 shrink-0 items-center gap-1 px-4">
        <IconButton label="Close" onClick={onClose}>
          <X className="size-5" strokeWidth={2.5} />
        </IconButton>
        {expandHref && (
          <Link href={expandHref} className="inline-flex size-8 items-center justify-center rounded-xl text-fg-2 hover:bg-hover" title="Open as page">
            <Maximize2 className="size-3.5" />
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-16 pt-2 max-sm:px-5">{children}</div>
    </aside>,
    document.body,
  );
}
