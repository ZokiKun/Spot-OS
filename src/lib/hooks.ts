"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";

/** Ref that always holds the latest value — updated after render, read in handlers/effects. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Debounced function that flushes pending calls on unmount (so nothing typed is lost). */
export function useDebouncedSave<T>(save: (value: T) => void, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useLatest(save);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  }, [saveRef]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => flush, [flush]);
  return { schedule, flush };
}

const STORAGE_PREFIX = "spotos:pref:";

/** Tiny per-device preference (e.g. finance hidden/revealed). */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref<T>(key: string, value: T) {
  try {
    if (value === undefined) localStorage.removeItem(STORAGE_PREFIX + key);
    else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  prefListeners.forEach((l) => l());
}

const prefListeners = new Set<() => void>();
function subscribePrefs(cb: () => void) {
  prefListeners.add(cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    prefListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * A per-device preference as React state: hydration-safe (the server and first paint use the
 * fallback) and shared live by every component reading the same key. Set `undefined` to clear.
 */
export function usePref<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        return localStorage.getItem(STORAGE_PREFIX + key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  // Parse only when the stored text changes, so the value keeps its identity between renders.
  const parsed = useMemo(() => {
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }, [raw]);
  const value = parsed === undefined ? fallback : parsed;
  const set = useCallback((v: T | undefined) => writePref(key, v), [key]);
  return [value, set] as const;
}
