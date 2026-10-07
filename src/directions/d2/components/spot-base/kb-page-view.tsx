"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Download, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { renderMarkdown } from "@/directions/d2/lib/markdown";
import { useDebouncedSave } from "@/directions/d2/lib/hooks";
import { cn, downloadFile, timeAgo } from "@/directions/d2/lib/utils";
import { Page } from "@/directions/d2/components/shell/page";
import { CircleButton, Eyebrow, MUTED, PillButton, SOFT, TONE } from "@/directions/d2/components/ui/chunk";
import { AutoTextarea, EditableText } from "@/directions/d2/components/ui/input";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { MenuItem, MenuList } from "@/directions/d2/components/ui/menu";
import { DARK_PILL, KB_ICONS, ON_CHUNK_PROSE, SPOT_MD, sortPages } from "./kb-utils";

/** One Spot Base page: a cream reading card, with a split editor behind "Edit". */
export function KbPageView({ slug }: { slug: string }) {
  const { data, status, update, remove, me } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const pages = useMemo(() => sortPages(data.kb_pages), [data.kb_pages]);
  const page = pages.find((p) => p.slug === slug);

  const [editing, setEditing] = useState(false);
  // Open straight into the editor for "?edit=1" (new pages). `page` only exists once the
  // workspace has loaded on the client, so reading the URL here is safe.
  const [checkedUrl, setCheckedUrl] = useState(false);
  if (page && !checkedUrl) {
    setCheckedUrl(true);
    setEditing(new URLSearchParams(window.location.search).has("edit"));
  }

  // Draft follows remote changes while not editing (adjust state during render).
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState<string | null>(null);
  if (page && !editing && page.content_md !== seen) {
    setSeen(page.content_md);
    setDraft(page.content_md);
  }
  const { schedule, flush } = useDebouncedSave<string>((content_md) => page && void update("kb_pages", page.id, { content_md, updated_by: me?.id ?? null }), 800);
  const source = editing ? draft : (page?.content_md ?? "");
  const html = useMemo(() => renderMarkdown(source), [source]);

  const { setAnchor: menuAnchor, ...menu } = usePopover();
  const { setAnchor: iconAnchor, ...iconPop } = usePopover();

  const others = pages.filter((p) => p.id !== page?.id);

  return (
    <Page
      width={editing ? "wide" : "doc"}
      crumbs={[{ label: "Spot Base", href: "/spot-base" }, { label: page?.title || (status === "ready" ? "Not found" : "…") }]}
      actions={
        page && (
          <>
            <PillButton
              tone={editing ? "ink" : "surface"}
              onClick={() => {
                if (editing) flush();
                setEditing((e) => !e);
              }}
            >
              {editing ? <Check /> : <Pencil />}
              {editing ? "Done" : "Edit"}
            </PillButton>
            <CircleButton ref={menuAnchor} label="More" tone="surface" onClick={menu.toggle}>
              <Ellipsis />
            </CircleButton>
            <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={210}>
              <MenuList>
                <MenuItem
                  icon={<Download className="size-4" />}
                  onSelect={() => {
                    downloadFile(`${page.slug}.md`, `# ${page.title}\n\n${page.content_md}\n`, "text/markdown");
                    menu.close();
                  }}
                >
                  Download .md
                </MenuItem>
                <MenuItem
                  danger
                  icon={<Trash2 className="size-4" />}
                  onSelect={() => {
                    menu.close();
                    if (confirm(`Delete “${page.title}”?`)) {
                      void remove("kb_pages", page.id);
                      router.push("/spot-base");
                    }
                  }}
                >
                  Delete page
                </MenuItem>
              </MenuList>
            </Popover>
          </>
        )
      }
    >
      {!page ? (
        <div className={cn("anim-rise mx-auto flex max-w-[520px] flex-col items-center rounded-[28px] px-8 py-10 text-center", TONE.cream)}>
          <div className="text-[24px] font-medium tracking-[-0.02em]">This page isn’t here</div>
          <p className={cn("mt-2 text-[14px]", MUTED.cream)}>It may have been renamed or deleted.</p>
          <Link href="/spot-base" className={cn(DARK_PILL, "mt-5")}>
            Back to Spot Base
          </Link>
        </div>
      ) : (
        <>
          <article className={cn("anim-rise rounded-[28px]", TONE.cream, ON_CHUNK_PROSE, editing ? "p-6 sm:p-8" : "p-7 sm:p-12")}>
            <button
              ref={iconAnchor}
              type="button"
              onClick={iconPop.toggle}
              aria-label="Change icon"
              className={cn("flex size-16 items-center justify-center rounded-full text-[34px] leading-none transition-colors hover:bg-[var(--chunk-soft-2)]", SOFT.cream)}
            >
              {page.icon ?? "📄"}
            </button>
            <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={296}>
              <div className="grid grid-cols-8 gap-0.5 p-2">
                {KB_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      void update("kb_pages", page.id, { icon: i });
                      iconPop.close();
                    }}
                    className="flex size-8 items-center justify-center rounded-full text-[18px] hover:bg-hover"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </Popover>
            <EditableText
              value={page.title}
              placeholder="Untitled"
              onCommit={(title) => title && void update("kb_pages", page.id, { title, updated_by: me?.id ?? null })}
              className="mt-5 text-[32px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[40px]"
            />
            <div className={cn("mt-2 text-[13px]", MUTED.cream)}>
              Edited {timeAgo(page.updated_at)} by {people.get(page.updated_by)?.full_name ?? "someone"}
            </div>

            {!editing &&
              (page.content_md.trim() ? (
                <div className="prose-notion mt-8 max-w-[680px]" onDoubleClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <button type="button" onClick={() => setEditing(true)} className={cn("mt-8 rounded-full px-4 py-2 -ml-4 text-[16px] hover:bg-[var(--chunk-soft)]", MUTED.cream)}>
                  Nothing here yet — tap to start writing.
                </button>
              ))}
          </article>

          {editing && (
            <div className="anim-fade mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="flex min-w-0 flex-col rounded-[28px] bg-elevated p-5 sm:p-6">
                <Eyebrow className="mb-3">Write · Markdown</Eyebrow>
                <AutoTextarea
                  autoFocus
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    schedule(e.target.value);
                  }}
                  onBlur={flush}
                  style={{ outline: "none" }}
                  className="min-h-[360px] font-mono text-[13px] leading-relaxed"
                  placeholder="Write in Markdown — # headings, - lists, **bold**, | tables |"
                />
              </div>
              <div className={cn("min-w-0 rounded-[28px] p-5 sm:p-6", TONE.cream, ON_CHUNK_PROSE)}>
                <Eyebrow className="mb-3">Preview</Eyebrow>
                {draft.trim() ? (
                  <div className="prose-notion" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <p className={cn("text-[15px]", MUTED.cream)}>Your page will appear here as you type.</p>
                )}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-[17px] font-medium tracking-[-0.01em]">More in Spot Base</h2>
              <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
                {others.map((p) => (
                  <Link
                    key={p.id}
                    href={`/spot-base/${p.slug}`}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-elevated pl-2 pr-4 text-[14px] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_90%,var(--text))]"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-hover text-[15px] leading-none">{p.icon ?? "📄"}</span>
                    <span className="max-w-[220px] truncate">{p.title || "Untitled"}</span>
                  </Link>
                ))}
                <Link href={`/spot-base/${SPOT_MD}`} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink pl-2 pr-4 text-[14px] text-on-ink">
                  <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[15px] leading-none">🧠</span>
                  SPOT.md
                </Link>
              </nav>
            </section>
          )}
        </>
      )}
    </Page>
  );
}
