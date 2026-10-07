"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Copy, Download, Ellipsis, FileCode2, Pencil, Plus, Trash2 } from "lucide-react";
import type { KbPage } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";
import { buildSpotMd } from "@/lib/spot-md";
import { useDebouncedSave } from "@/lib/hooks";
import { DEFAULT_KB_PAGES } from "@/lib/data/kb-defaults";
import { cn, downloadFile, slugify, timeAgo } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Button, IconButton } from "@/components/ui/button";
import { AutoTextarea, EditableText } from "@/components/ui/input";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuItem, MenuList } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/misc";

const SPOT_MD = "spot-md";

export function SpotBaseView({ slug }: { slug?: string }) {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const pages = useMemo(() => data.kb_pages.slice().sort((a, b) => a.sort_order - b.sort_order), [data.kb_pages]);
  const current = slug === SPOT_MD ? null : (pages.find((p) => p.slug === slug) ?? (slug ? undefined : pages[0]));
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";

  const addPage = async () => {
    const title = "Untitled";
    let s = slugify(title);
    let n = 1;
    while (pages.some((p) => p.slug === s)) s = `${slugify(title)}-${++n}`;
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

  return (
    <Page width="full" className="max-w-[1180px]" crumbs={[{ label: "Spot Base", href: "/spot-base", icon: <BookOpen className="size-4" /> }, ...(slug === SPOT_MD ? [{ label: "SPOT.md" }] : current ? [{ label: current.title, icon: <span>{current.icon}</span> }] : [])]}>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-16 md:self-start">
          <div className="mb-1 px-2 text-[12px] font-medium text-fg-2">Pages</div>
          <nav className="flex gap-0.5 overflow-x-auto md:flex-col">
            {pages.map((p) => (
              <Link
                key={p.id}
                href={`/spot-base/${p.slug}`}
                className={cn(
                  "flex h-[30px] shrink-0 items-center gap-2 rounded-md px-2 text-[14px] transition-colors",
                  current?.id === p.id ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
                )}
              >
                <span className="w-5 text-center">{p.icon}</span>
                <span className="truncate">{p.title}</span>
              </Link>
            ))}
            <button type="button" onClick={() => void addPage()} className="flex h-[30px] shrink-0 items-center gap-2 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2">
              <Plus className="size-4" /> Add page
            </button>
          </nav>
          <div className="mt-4 border-t border-line pt-3">
            <Link
              href={`/spot-base/${SPOT_MD}`}
              className={cn(
                "flex h-[30px] items-center gap-2 rounded-md px-2 text-[14px]",
                slug === SPOT_MD ? "bg-active font-medium" : "text-fg-2 hover:bg-hover",
              )}
            >
              <FileCode2 className="size-4" /> SPOT.md
            </Link>
          </div>
        </aside>
        <div className="min-w-0">
          {pages.length === 0 && slug !== SPOT_MD ? (
            <EmptyState
              title="Spot Base is empty"
              description="Start with the suggested structure: who we are, positioning, brand, methodology, team, services, tools and file conventions."
              action={
                <Button
                  variant="primary"
                  onClick={() =>
                    DEFAULT_KB_PAGES.forEach((p, i) =>
                      void create("kb_pages", { ...p, sort_order: i, updated_by: me?.id ?? null }),
                    )
                  }
                >
                  Add starter pages
                </Button>
              }
            />
          ) : slug === SPOT_MD ? (
            <SpotMdPanel md={buildSpotMd(pages, workspaceName)} />
          ) : current ? (
            <KbPageEditor key={current.id} page={current} />
          ) : (
            <EmptyState title="Page not found" action={<Link href="/spot-base" className="text-accent">Back to Spot Base</Link>} />
          )}
        </div>
      </div>
    </Page>
  );
}

function KbPageEditor({ page }: { page: KbPage }) {
  const { update, remove, me } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover();
  // Rendered only after the workspace has loaded (client-side), so reading the URL here is safe.
  const [editing, setEditing] = useState(() => new URLSearchParams(window.location.search).has("edit"));
  const [draft, setDraft] = useState(page.content_md);
  const [seen, setSeen] = useState(page.content_md);
  if (!editing && page.content_md !== seen) {
    setSeen(page.content_md);
    setDraft(page.content_md);
  }
  const { schedule, flush } = useDebouncedSave<string>((content_md) => void update("kb_pages", page.id, { content_md, updated_by: me?.id ?? null }), 800);
  const html = useMemo(() => renderMarkdown(editing ? draft : page.content_md), [editing, draft, page.content_md]);


  const icons = ["📄", "👋", "🛠️", "🎯", "🗣️", "📜", "🟠", "💭", "🧪", "👥", "📦", "🧰", "🗂️", "💡", "📌", "🧭"];
  const { setAnchor: iconPopAnchorRef, ...iconPop } = usePopover();

  return (
    <article>
      <div className="flex items-start justify-between gap-2">
        <button ref={iconPopAnchorRef} type="button" onClick={iconPop.toggle} className="-ml-1 flex size-16 items-center justify-center rounded-lg text-[48px] leading-none hover:bg-hover">
          {page.icon ?? "📄"}
        </button>
        <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={300}>
          <div className="grid grid-cols-8 gap-0.5 p-2">
            {icons.map((i) => (
              <button key={i} type="button" onClick={() => (void update("kb_pages", page.id, { icon: i }), iconPop.close())} className="flex size-8 items-center justify-center rounded-md text-[18px] hover:bg-hover">
                {i}
              </button>
            ))}
          </div>
        </Popover>
        <div className="flex items-center gap-1">
          <Button
            variant={editing ? "primary" : "secondary"}
            onClick={() => {
              if (editing) flush();
              setEditing((e) => !e);
            }}
          >
            {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Done" : "Edit"}
          </Button>
          <IconButton ref={menuAnchorRef} label="More" size="md" onClick={menu.toggle}>
            <Ellipsis className="size-4" />
          </IconButton>
          <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={200}>
            <MenuList>
              <MenuItem icon={<Download className="size-4" />} onSelect={() => (downloadFile(`${page.slug}.md`, `# ${page.title}\n\n${page.content_md}\n`, "text/markdown"), menu.close())}>
                Download .md
              </MenuItem>
              <MenuItem
                danger
                icon={<Trash2 className="size-4" />}
                onSelect={() => {
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
        </div>
      </div>
      <EditableText
        value={page.title}
        onCommit={(title) => title && void update("kb_pages", page.id, { title, updated_by: me?.id ?? null })}
        className="mt-1 text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]"
      />
      <div className="mb-6 mt-1 text-[12px] text-fg-3">
        Edited {timeAgo(page.updated_at)} by {people.get(page.updated_by)?.full_name ?? "someone"}
      </div>

      {editing ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-md bg-subtle p-4 shadow-[inset_0_0_0_1px_var(--border)]">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">Markdown</div>
            <AutoTextarea
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                schedule(e.target.value);
              }}
              onBlur={flush}
              className="min-h-[320px] font-mono text-[13px] leading-relaxed"
              placeholder="Write in Markdown — # headings, - lists, **bold**, | tables |"
            />
          </div>
          <div className="prose-notion min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ) : page.content_md.trim() ? (
        <div className="prose-notion" onDoubleClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-[16px] text-fg-3 hover:text-fg-2">
          Empty page — click to write.
        </button>
      )}
    </article>
  );
}

function SpotMdPanel({ md }: { md: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-2 text-[44px] leading-none">🧠</div>
      <h1 className="text-[32px] font-bold leading-tight sm:text-[40px]">SPOT.md</h1>
      <p className="mt-1.5 text-[15px] text-fg-2">
        The canonical studio context document, generated from every Spot Base page. It’s ready to use as context for an internal AI assistant later.
      </p>
      <div className="mb-3 mt-5 flex gap-1.5">
        <Button onClick={() => downloadFile("SPOT.md", md, "text/markdown")}>
          <Download className="size-3.5" /> Download SPOT.md
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(md).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md bg-subtle p-5 font-mono text-[12.5px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border)]">{md}</pre>
    </div>
  );
}
