"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | null;
  children: ReactNode;
  align?: "start" | "end";
  width?: number | "anchor";
  className?: string;
  offset?: number;
}

/** Floating menu surface anchored to an element (Notion menus: white, 6px radius, layered shadow). */
export function Popover({ open, onClose, anchor, children, align = "start", width, className, offset = 4 }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number; maxHeight: number } | null>(null);

  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const r = anchor.getBoundingClientRect();
    const w = width === "anchor" ? r.width : (width ?? panel.offsetWidth);
    const h = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    const below = vh - r.bottom - offset - 8;
    const above = r.top - offset - 8;
    const flip = h > below && above > below;
    const top = flip ? Math.max(8, r.top - offset - Math.min(h, above)) : r.bottom + offset;
    setPos({ top, left, width: width ? w : undefined, maxHeight: Math.max(160, flip ? above : below) });
  }, [anchor, align, width, offset]);

  // Measuring the anchor and panel needs the DOM, so place it in a layout effect (before paint).
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const ro = new ResizeObserver(onMove);
    if (panelRef.current) ro.observe(panelRef.current);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      ro.disconnect();
    };
  }, [open, onClose, anchor, place]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      className={cn(
        "anim-pop fixed z-50 overflow-y-auto rounded-md bg-elevated text-fg shadow-menu",
        !pos && "invisible",
        className,
      )}
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: pos?.width, maxHeight: pos?.maxHeight }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** `setAnchor` is a callback ref; the element is kept in state so render never reads a ref. */
export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [anchor, setAnchor] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return { setAnchor, anchor, open, setOpen, close, toggle };
}
