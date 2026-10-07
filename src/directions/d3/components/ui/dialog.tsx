"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/directions/d3/lib/utils";
import { IconButton } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="anim-fade fixed inset-0 z-40 flex items-start justify-center bg-[rgba(0,0,0,0.5)] px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("anim-bounce flex max-h-[80vh] w-full flex-col overflow-hidden rounded-3xl border-2 border-line bg-bg", className)}
        style={{ maxWidth: width }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pb-1 pt-5">
            <h2 className="text-[22px] font-extrabold">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-5" strokeWidth={2.5} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t-2 border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
