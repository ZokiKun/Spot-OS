"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";
import { pressDismissedPopover } from "./popover";

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
    <div className="anim-fade fixed inset-0 z-40 flex items-start justify-center bg-[rgba(15,15,15,0.6)] px-4 pt-[12vh]" onPointerDown={(e) => !pressDismissedPopover(e.nativeEvent) && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
        className={cn("anim-pop flex max-h-[76vh] w-full flex-col overflow-hidden rounded-xl bg-elevated shadow-menu", className)}
        style={{ maxWidth: width }}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <h2 className="text-[16px] font-semibold">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
