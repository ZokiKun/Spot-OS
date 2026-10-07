"use client";

import { useRouter } from "next/navigation";
import type { KbPage } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { slugify } from "@/lib/utils";
import type { Tone } from "@/components/ui/chunk";

export const SPOT_MD = "spot-md";

/** Spot Base pages are reading material: they cycle through the softer chunk colours. */
const PAGE_TONES: Tone[] = ["cream", "sky", "lime", "sun", "lilac", "pink"];
export const toneForIndex = (i: number): Tone => PAGE_TONES[((i % PAGE_TONES.length) + PAGE_TONES.length) % PAGE_TONES.length];

export const KB_ICONS = ["📄", "👋", "🛠️", "🎯", "🗣️", "📜", "🟠", "💭", "🧪", "👥", "📦", "🧰", "🗂️", "💡", "📌", "🧭"];

/**
 * Rendered markdown on a colour card: `.prose-notion` reads theme tokens (light text in dark
 * mode), so point those tokens at the card's dark ink instead.
 */
export const ON_CHUNK_PROSE =
  "[--text:var(--on-chunk)] [--text-2:var(--on-chunk-2)] [--text-3:var(--on-chunk-2)] [--bg-active:var(--chunk-soft)] [--border-strong:var(--chunk-soft-2)] [--border:var(--chunk-soft)]";

/** A dark pill that stays dark in both themes (for buttons sitting on colour cards). */
export const DARK_PILL =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#151515] px-5 text-[14px] font-medium text-[#f7f3ea] transition-[background,transform] duration-150 hover:bg-[#2e2d2b] active:scale-[0.97] [&_svg]:size-4";

/** Markdown → one line of plain text for card previews. Headings and list items become "a · b". */
export function mdToPlain(md: string, max = 220) {
  const lines = md
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .split("\n");
  let out = "";
  let prevBlock = false;
  for (const raw of lines) {
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(raw) || /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/.test(raw)) continue;
    const block = /^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(raw);
    const text = raw
      .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/, "")
      .replace(/^\[[ xX]\]\s/, "")
      .replace(/^\s*\||\|\s*$/g, "")
      .replace(/\s*\|\s*/g, " · ")
      .replace(/[*~`]+/g, "")
      .replace(/(^|[\s(])_+|_+(?=[\s).,!?:;]|$)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const sep = !out ? "" : (block || prevBlock) && !/[.!?:…]$/.test(out) ? " · " : " ";
    out += sep + text;
    prevBlock = block;
    if (out.length > max) break;
  }
  return out.slice(0, max);
}

export function sortPages(pages: KbPage[]) {
  return pages.slice().sort((a, b) => a.sort_order - b.sort_order);
}

/** Creates an "Untitled" page with a unique slug and opens it in edit mode. */
export function useAddKbPage(pages: KbPage[]) {
  const { create, me } = useWorkspace();
  const router = useRouter();
  return async () => {
    const title = "Untitled";
    let s = slugify(title);
    let n = 1;
    while (s === SPOT_MD || pages.some((p) => p.slug === s)) s = `${slugify(title)}-${++n}`;
    const page = await create("kb_pages", {
      slug: s,
      title,
      icon: "📄",
      content_md: "",
      sort_order: (pages.at(-1)?.sort_order ?? 0) + 1,
      updated_by: me?.id ?? null,
    });
    router.push(`/spot-base/${page.slug}?edit=1`);
  };
}
