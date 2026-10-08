"use client";

import { useSyncExternalStore } from "react";
import { NAV_ITEMS } from "@/lib/constants";

/**
 * In-app trail of pages, so the top bar's back button can say where it goes ("Back to Home")
 * and only shows when there's somewhere in Spot OS to go back to. It mirrors the browser
 * history: a new pathname is pushed, and the browser's back (popstate) pops it.
 */
type Entry = { path: string };
const STORE_KEY = "spotos:trail"; // per browser tab, so a reload keeps the back button
let trail: Entry[] = [];
let popped = false;
let titles = new Map<string, string>();
let restored = false;
const listeners = new Set<() => void>();
const emit = () => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ trail: trail.slice(-50), titles: [...titles].slice(-100) }));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
};

function restore() {
  if (restored) return;
  restored = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "null") as { trail: Entry[]; titles: [string, string][] } | null;
    if (saved) {
      trail = saved.trail;
      titles = new Map(saved.titles);
    }
  } catch {
    /* ignore */
  }
}

export function recordVisit(path: string) {
  restore();
  const prev = trail.at(-2);
  if (popped && prev?.path === path) trail = trail.slice(0, -1);
  else if (trail.at(-1)?.path !== path) trail = [...trail, { path }];
  popped = false;
  emit();
}

/** Call from a popstate listener: the next visit came from the browser's back/forward. */
export function markPopState() {
  popped = true;
}

/** Pages report their title so the back button can name them. */
export function recordTitle(path: string, title: string) {
  restore();
  if (titles.get(path) === title) return;
  titles.set(path, title);
  emit();
}

function fallbackLabel(path: string) {
  const nav = NAV_ITEMS.find((i) => (i.href === "/" ? path === "/" : path === i.href));
  if (nav) return nav.label;
  if (path === "/projects/tasks") return "Tasks";
  if (path.startsWith("/settings")) return "Settings";
  return "previous page";
}

let snapshot: { label: string } | null = null;
let snapshotKey = "";
function read() {
  const prev = trail.at(-2);
  const label = prev ? (titles.get(prev.path) ?? fallbackLabel(prev.path)) : null;
  const key = label ?? "";
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshot = label ? { label } : null;
  }
  return snapshot;
}

/** Where the back button leads, or null on the first page of the visit. */
export function useBackTarget() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    read,
    () => null,
  );
}
