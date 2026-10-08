"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ThemePref } from "@/lib/types";

const KEY = "spotos:theme";
const PALETTE_KEY = "spotos:palette";
const listeners = new Set<() => void>();

/** Colour themes — the CSS for each lives at the end of src/styles/direction-1.css. */
export const PALETTES = [
  { id: "default", label: "Default", swatch: ["#2383e2", "#f8f8f7"] },
  { id: "ocean", label: "Ocean", swatch: ["#0f8b8d", "#f0f6f6"] },
  { id: "forest", label: "Forest", swatch: ["#3f7d4e", "#f2f6f0"] },
  { id: "sunset", label: "Sunset", swatch: ["#d4602a", "#fbf4ee"] },
  { id: "grape", label: "Grape", swatch: ["#7a4cc9", "#f6f2fb"] },
  { id: "rose", label: "Rose", swatch: ["#cc4476", "#fbf2f5"] },
  { id: "graphite", label: "Graphite", swatch: ["#37352f", "#f3f3f2"] },
] as const;
export type Palette = (typeof PALETTES)[number]["id"];
const isPalette = (v: unknown): v is Palette => PALETTES.some((p) => p.id === v);

function read(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || "system";
  } catch {
    return "system";
  }
}

function readPalette(): Palette {
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    return isPalette(v) ? v : "default";
  } catch {
    return "default";
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function applyPalette(palette: Palette) {
  if (palette === "default") delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = palette;
}

/** Inline script for <head> — sets data-theme and data-palette before paint to avoid a flash. */
export const themeScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var c=localStorage.getItem('${PALETTE_KEY}');if(c&&c!=='default')document.documentElement.dataset.palette=c}catch(e){}})();`;

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as ThemePref);
  const palette = useSyncExternalStore(subscribe, readPalette, () => "default" as Palette);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  useEffect(() => applyPalette(palette), [palette]);

  const setPref = useCallback((p: ThemePref) => store(KEY, p), []);
  const setPalette = useCallback((p: Palette) => store(PALETTE_KEY, p), []);

  return { pref, setPref, palette, setPalette };
}
