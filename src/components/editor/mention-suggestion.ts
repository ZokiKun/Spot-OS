"use client";

import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { Profile } from "@/lib/types";

type Item = { id: string; label: string; role: string | null };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * "@" suggestion list for the rich editor. Plain DOM (no React root) so it can live
 * inside Tiptap's plugin lifecycle; the refs are read on every keystroke.
 */
export function mentionSuggestion(people: { current: Profile[] }, meId: { current: string | null }): Omit<SuggestionOptions<Item>, "editor"> {
  return {
    char: "@",
    items: ({ query }) => {
      const q = query.toLowerCase();
      return people.current
        .filter((p) => p.id !== meId.current)
        .filter((p) => !q || p.full_name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || p.full_name.toLowerCase().startsWith(q))
        .slice(0, 6)
        .map((p) => ({ id: p.id, label: p.full_name, role: p.role_title }));
    },
    render: () => {
      let el: HTMLDivElement | null = null;
      let props: SuggestionProps<Item> | null = null;
      let selected = 0;

      const draw = () => {
        if (!el || !props) return;
        if (!props.items.length) {
          el.style.display = "none";
          return;
        }
        el.style.display = "block";
        el.innerHTML =
          `<div class="px-2 pb-1 pt-0.5 text-[11px] font-medium text-fg-3">Mention a member</div>` +
          props.items
            .map(
              (it, i) =>
                `<button type="button" data-i="${i}" class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] ${i === selected ? "bg-hover" : ""}">` +
                `<span class="min-w-0 flex-1 truncate">${esc(it.label)}</span>${it.role ? `<span class="truncate text-[11px] text-fg-3">${esc(it.role)}</span>` : ""}</button>`,
            )
            .join("");
      };
      const place = () => {
        const r = props?.clientRect?.();
        if (!el || !r) return;
        el.style.left = `${Math.min(r.left, window.innerWidth - 248)}px`;
        el.style.top = `${r.bottom + 4}px`;
      };
      const choose = (i: number) => {
        const it = props?.items[i];
        if (it && props) props.command({ id: it.id, label: it.label });
      };

      return {
        onStart: (p) => {
          props = p;
          selected = 0;
          el = document.createElement("div");
          el.setAttribute("role", "listbox");
          el.className = "anim-pop fixed z-[60] w-60 rounded-md bg-elevated p-1 text-fg shadow-menu";
          el.addEventListener("mousedown", (e) => {
            const b = (e.target as HTMLElement).closest("button[data-i]");
            if (!b) return;
            e.preventDefault();
            choose(Number(b.getAttribute("data-i")));
          });
          document.body.appendChild(el);
          draw();
          place();
        },
        onUpdate: (p) => {
          props = p;
          selected = 0;
          draw();
          place();
        },
        onKeyDown: ({ event }) => {
          const n = props?.items.length ?? 0;
          if (!n) return false;
          if (event.key === "ArrowDown") selected = (selected + 1) % n;
          else if (event.key === "ArrowUp") selected = (selected - 1 + n) % n;
          else if (event.key === "Enter" || event.key === "Tab") {
            choose(selected);
            return true;
          } else if (event.key === "Escape") {
            if (el) el.style.display = "none";
            return true;
          } else return false;
          draw();
          return true;
        },
        onExit: () => {
          el?.remove();
          el = null;
          props = null;
        },
      };
    },
  };
}
