"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/directions/d2/lib/utils";
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
    <div className="anim-fade fixed inset-0 z-40 flex items-start justify-center bg-[rgba(12,12,12,0.55)] px-4 pt-[10vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("anim-pop flex max-h-[80vh] w-full flex-col overflow-hidden rounded-[28px] bg-elevated shadow-menu", className)}
        style={{ maxWidth: width }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pb-1 pt-5">
            <h2 className="text-[22px] font-medium tracking-[-0.02em]">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
