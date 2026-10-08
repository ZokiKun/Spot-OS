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

// ─── Open popovers form a stack ───
// One capture-phase listener closes popovers from the top down until it reaches the one the
// press landed in (or its anchor). Capture phase matters: dialogs and rows stop mousedown from
// bubbling, which used to leave popovers stuck open. Opening a popover elsewhere therefore
// closes any unrelated one, while a popover opened from inside another keeps its parent.
type Layer = { panel: () => HTMLElement | null; anchor: () => HTMLElement | null; close: () => void };
const layers: Layer[] = [];
const dismissed = new WeakSet<Event>();

/** True when this press closed a popover — other "click outside" handlers should ignore it. */
export const pressDismissedPopover = (e: Event) => dismissed.has(e);
export const hasOpenPopover = () => layers.length > 0;

function onLayerPress(e: PointerEvent) {
  const t = e.target as Node;
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.panel()?.contains(t) || l.anchor()?.contains(t)) break;
    dismissed.add(e);
    l.close();
  }
}
function onLayerKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || !layers.length) return;
  e.stopPropagation();
  layers[layers.length - 1].close();
}
function pushLayer(l: Layer) {
  if (!layers.length) {
    document.addEventListener("pointerdown", onLayerPress, true);
    document.addEventListener("keydown", onLayerKey, true);
  }
  layers.push(l);
  return () => {
    const i = layers.indexOf(l);
    if (i >= 0) layers.splice(i, 1);
    if (!layers.length) {
      document.removeEventListener("pointerdown", onLayerPress, true);
      document.removeEventListener("keydown", onLayerKey, true);
    }
  };
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

  // Read through a ref so the layer keeps its place in the stack across re-renders.
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  const anchorRef = useRef(anchor);
  useLayoutEffect(() => {
    anchorRef.current = anchor;
  });
  useEffect(() => {
    if (!open) return;
    return pushLayer({ panel: () => panelRef.current, anchor: () => anchorRef.current, close: () => closeRef.current() });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const ro = new ResizeObserver(onMove);
    if (panelRef.current) ro.observe(panelRef.current);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      ro.disconnect();
    };
  }, [open, place]);

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
