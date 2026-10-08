"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ThemePref } from "@/lib/types";

const KEY = "spotos:theme";
const PALETTE_KEY = "spotos:palette";
const TYPEFACE_KEY = "spotos:typeface";
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

/** Font pairings — the @font-face rules and overrides live at the end of src/styles/direction-1.css. */
export const TYPEFACES = [
  { id: "system", label: "System", heading: "System UI", body: "System UI" },
  { id: "studio", label: "Studio", heading: "Projekt Blackbird", body: "Red Hat Text" },
] as const;
export type Typeface = (typeof TYPEFACES)[number]["id"];
const isTypeface = (v: unknown): v is Typeface => TYPEFACES.some((t) => t.id === v);

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

function readTypeface(): Typeface {
  try {
    const v = localStorage.getItem(TYPEFACE_KEY);
    return isTypeface(v) ? v : "system";
  } catch {
    return "system";
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

function applyTypeface(typeface: Typeface) {
  if (typeface === "system") delete document.documentElement.dataset.typeface;
  else document.documentElement.dataset.typeface = typeface;
}

/** Inline script for <head> — sets data-theme, data-palette and data-typeface before paint to avoid a flash. */
export const themeScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var c=localStorage.getItem('${PALETTE_KEY}');if(c&&c!=='default')document.documentElement.dataset.palette=c;var t=localStorage.getItem('${TYPEFACE_KEY}');if(t&&t!=='system')document.documentElement.dataset.typeface=t}catch(e){}})();`;

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
  const typeface = useSyncExternalStore(subscribe, readTypeface, () => "system" as Typeface);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  useEffect(() => applyPalette(palette), [palette]);
  useEffect(() => applyTypeface(typeface), [typeface]);

  const setPref = useCallback((p: ThemePref) => store(KEY, p), []);
  const setPalette = useCallback((p: Palette) => store(PALETTE_KEY, p), []);
  const setTypeface = useCallback((t: Typeface) => store(TYPEFACE_KEY, t), []);

  return { pref, setPref, palette, setPalette, typeface, setTypeface };
}
