"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleCheck, FileText, Link2, Search } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/constants";
import { cn, formatDay } from "@/lib/utils";
import { NAV_ART } from "./icons";

interface Result {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ");

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields: (string | null | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));
    const out: Result[] = [];
    if (!q)
      NAV_ITEMS.forEach((n) => {
        const Art = NAV_ART[n.icon]!;
        out.push({ id: n.href, group: "Go to", label: n.label, icon: <Art size={22} />, href: n.href });
      });
    data.projects
      .filter((p) => match(p.name, p.client, p.description))
      .slice(0, q ? 6 : 4)
      .forEach((p) =>
        out.push({ id: p.id, group: "Projects", label: p.name, hint: p.client ?? undefined, icon: <span className="text-[14px]">{p.icon ?? "📁"}</span>, href: `/projects/${p.id}` }),
      );
    if (q) {
      data.tasks
        .filter((t) => match(t.title, t.description))
        .slice(0, 6)
        .forEach((t) =>
          out.push({
            id: t.id,
            group: "Tasks",
            label: t.title,
            hint: t.due_date ? formatDay(t.due_date) : undefined,
            icon: <CircleCheck className="size-4" />,
            href: t.project_id ? `/projects/${t.project_id}?tab=tasks&task=${t.id}` : `/projects/tasks?task=${t.id}`,
          }),
        );
      data.library_items
        .filter((l) => match(l.name, l.description, l.tags.join(" ")))
        .slice(0, 5)
        .forEach((l) => out.push({ id: l.id, group: "Library", label: l.name, icon: <Link2 className="size-4" />, href: l.url, external: true }));
      data.calendar_notes
        .filter((n) => match(n.title, stripHtml(n.content_html)))
        .slice(0, 5)
        .forEach((n) =>
          out.push({ id: n.id, group: "Calendar", label: n.title || "Untitled note", hint: formatDay(n.date), icon: <CalendarDays className="size-4" />, href: `/calendar?date=${n.date}&note=${n.id}` }),
        );
      data.kb_pages
        .filter((k) => match(k.title, k.content_md))
        .slice(0, 5)
        .forEach((k) => out.push({ id: k.id, group: "Spot Base", label: k.title, icon: <FileText className="size-4" />, href: `/spot-base/${k.slug}` }));
    }
    return out;
  }, [data, query]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    if (r.external) window.open(r.href, "_blank", "noopener,noreferrer");
    else router.push(r.href);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || typeof document === "undefined") return null;
  let lastGroup = "";
  return createPortal(
    <div className="anim-fade fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.5)] px-4 pt-[14vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Search"
        onMouseDown={(e) => e.stopPropagation()}
        className="anim-bounce w-full max-w-[620px] overflow-hidden rounded-3xl border-2 border-line bg-bg"
      >
        <div className="flex items-center gap-3 border-b-2 border-line px-5">
          <Search className="size-5 text-fg-3" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === "Escape") onClose();
            }}
            placeholder="Search projects, tasks, library, notes, Spot Base…"
            className="h-14 flex-1 bg-transparent text-[17px] font-bold outline-none placeholder:font-semibold placeholder:text-fg-3"
          />
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <div className="px-3 py-8 text-center text-[15px] font-bold text-fg-3">No results for “{query}”</div>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={`${r.group}-${r.id}`}>
                {header && <div className="label-caps px-3 pb-1 pt-3 text-[11px] text-fg-3">{header}</div>}
                <button
                  type="button"
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn("flex h-11 w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 text-left text-[15px] font-bold", i === active && "border-line-selected bg-selected text-blue")}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center text-fg-2">{r.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {r.hint && <span className="shrink-0 text-[12px] text-fg-3">{r.hint}</span>}
                  {i === active && <span className="shrink-0 text-[12px] text-fg-3">↵</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
