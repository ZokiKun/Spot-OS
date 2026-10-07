"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronsRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { IconButton } from "./button";

/** Side sheet: open an item without leaving the list. Floats as a rounded card. */
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
    <aside className="anim-peek fixed inset-y-0 right-0 z-40 flex w-full max-w-[540px] flex-col bg-elevated shadow-menu sm:inset-y-3 sm:right-3 sm:rounded-[32px]">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <IconButton label="Close" size="md" className="bg-hover" onClick={onClose}>
          <ChevronsRight className="size-4" />
        </IconButton>
        {expandHref && (
          <Link href={expandHref} className="inline-flex size-10 items-center justify-center rounded-full bg-hover text-fg-2 hover:text-fg" title="Open as page">
            <Maximize2 className="size-3.5" />
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-16 pt-2 max-sm:px-5">{children}</div>
    </aside>,
    document.body,
  );
}
