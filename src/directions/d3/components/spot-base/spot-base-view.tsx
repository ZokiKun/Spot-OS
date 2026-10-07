"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import type { KbPage } from "@/directions/d3/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d3/lib/store";
import { renderMarkdown } from "@/directions/d3/lib/markdown";
import { buildSpotMd } from "@/directions/d3/lib/spot-md";
import { useDebouncedSave } from "@/directions/d3/lib/hooks";
import { DEFAULT_KB_PAGES } from "@/directions/d3/lib/data/kb-defaults";
import { cn, downloadFile, slugify, timeAgo } from "@/directions/d3/lib/utils";
import { Page } from "@/directions/d3/components/shell/page";
import { Button, IconButton } from "@/directions/d3/components/ui/button";
import { AutoTextarea, EditableText } from "@/directions/d3/components/ui/input";
import { Popover, usePopover } from "@/directions/d3/components/ui/popover";
import { MenuItem, MenuList } from "@/directions/d3/components/ui/menu";
import { ActionLink, Card, EmptyState, IconTile } from "@/directions/d3/components/ui/misc";
import { Banner } from "@/directions/d3/components/ui/banner";
import { NAV_ART } from "@/directions/d3/components/shell/icons";
import { RailCard } from "@/directions/d3/components/home/rail-cards";

const SPOT_MD = "spot-md";

export function SpotBaseView({ slug }: { slug?: string }) {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const pages = useMemo(() => data.kb_pages.slice().sort((a, b) => a.sort_order - b.sort_order), [data.kb_pages]);
  const current = slug === SPOT_MD ? null : slug ? pages.find((p) => p.slug === slug) : null;
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

  const crumbs = [{ label: "Spot Base", href: "/spot-base" }, ...(slug === SPOT_MD ? [{ label: "SPOT.md" }] : current ? [{ label: current.title }] : slug ? [{ label: "Not found" }] : [])];

  // Index: the guidebook's table of contents.
  if (!slug)
    return (
      <Page crumbs={crumbs} aside={<SpotMdCard />}>
        <Banner tone="green" overline={`${workspaceName} guidebook`} title="Spot Base" art={<NAV_ART.spotbase size={84} />}>
          Who we are, how we work, and where things live. Start anywhere — every page is short.
        </Banner>
        {pages.length === 0 ? (
          <Card className="mt-8">
            <EmptyState
              mood="think"
              title="Spot Base is empty"
              description="Start with the suggested pages: who we are, positioning, brand, methodology, team, services, tools and file conventions."
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => DEFAULT_KB_PAGES.forEach((p, i) => void create("kb_pages", { ...p, sort_order: i, updated_by: me?.id ?? null }))}
                >
                  Add starter pages
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pages.map((p) => (
              <Link key={p.id} href={`/spot-base/${p.slug}`} className="card-press flex items-start gap-3.5 rounded-2xl bg-bg p-4">
                <IconTile tone="green" size={48}>
                  {p.icon ?? "📄"}
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-extrabold">{p.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-fg-2">{preview(p.content_md) || "Empty page"}</div>
                </div>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => void addPage()}
              className="label-caps flex min-h-20 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-[13px] text-fg-3 hover:border-blue hover:bg-blue-soft hover:text-blue"
            >
              <Plus className="size-4" strokeWidth={3} /> Add page
            </button>
          </div>
        )}
      </Page>
    );

  return (
    <Page crumbs={crumbs} aside={<PagesCard pages={pages} currentId={current?.id} onAdd={() => void addPage()} />}>
      {slug === SPOT_MD ? (
        <SpotMdPanel md={buildSpotMd(pages, workspaceName)} />
      ) : current ? (
        <KbPageEditor key={current.id} page={current} />
      ) : (
        <Card>
          <EmptyState mood="worried" title="Page not found" action={<ActionLink href="/spot-base">Back to Spot Base</ActionLink>} />
        </Card>
      )}
    </Page>
  );
}

/** First real sentence of a page: skip headings, tables and code; fall back to the first list item. */
function preview(md: string) {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const para = lines.find((l) => !/^(#|\||[-*+]\s|\d+\.|>|```)/.test(l));
  const item = lines.find((l) => /^([-*+]\s|\d+\.)/.test(l));
  return (para ?? item ?? "")
    .replace(/^([-*+]\s|\d+\.\s*)/, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`]/g, "")
    .slice(0, 140);
}

function PagesCard({ pages, currentId, onAdd }: { pages: KbPage[]; currentId?: string; onAdd: () => void }) {
  return (
    <>
      <RailCard title="Pages" action={<ActionLink onClick={onAdd}>+ Add</ActionLink>}>
        <nav className="-mx-2 flex flex-col gap-0.5">
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/spot-base/${p.slug}`}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-xl border-2 px-2 text-[14.5px] font-bold",
                currentId === p.id ? "border-line-selected bg-selected text-blue" : "border-transparent text-fg-2 hover:bg-hover",
              )}
            >
              <span className="w-6 text-center text-[17px]">{p.icon}</span>
              <span className="truncate">{p.title}</span>
            </Link>
          ))}
        </nav>
      </RailCard>
      <SpotMdCard />
    </>
  );
}

function SpotMdCard() {
  return (
    <Link href={`/spot-base/${SPOT_MD}`} className="card-press flex items-center gap-4 rounded-2xl bg-bg px-5 py-4">
      <IconTile tone="purple" size={44}>
        🧠
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-extrabold">SPOT.md</div>
        <div className="text-[13px] font-semibold text-fg-2">Every page in one file, ready for an AI assistant.</div>
      </div>
    </Link>
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
        <button ref={iconPopAnchorRef} type="button" onClick={iconPop.toggle} className="flex size-[72px] items-center justify-center rounded-2xl bg-green-soft text-[42px] leading-none hover:brightness-95">
          {page.icon ?? "📄"}
        </button>
        <Popover open={iconPop.open} onClose={iconPop.close} anchor={iconPop.anchor} width={300}>
          <div className="grid grid-cols-8 gap-0.5 p-2">
            {icons.map((i) => (
              <button key={i} type="button" onClick={() => (void update("kb_pages", page.id, { icon: i }), iconPop.close())} className="flex size-9 items-center justify-center rounded-xl text-[19px] hover:bg-hover">
                {i}
              </button>
            ))}
          </div>
        </Popover>
        <div className="flex items-center gap-1">
          <Button
            variant={editing ? "primary" : "secondary"}
            size="md"
            onClick={() => {
              if (editing) flush();
              setEditing((e) => !e);
            }}
          >
            {editing ? <Check className="size-4" strokeWidth={3.5} /> : <Pencil className="size-4" strokeWidth={3} />}
            {editing ? "Done" : "Edit"}
          </Button>
          <IconButton ref={menuAnchorRef} label="More" size="md" onClick={menu.toggle}>
            <Ellipsis className="size-5" strokeWidth={3} />
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
        className="mt-4 text-[30px] font-black leading-tight sm:text-[34px]"
      />
      <div className="mb-6 mt-1 text-[13px] font-bold text-fg-3">
        Edited {timeAgo(page.updated_at)} by {people.get(page.updated_by)?.full_name ?? "someone"}
      </div>

      {editing ? (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-blue bg-subtle p-4">
            <div className="label-caps mb-2 text-[11px] text-blue">Writing · Markdown</div>
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
          <div>
            <div className="label-caps mb-2 text-[11px] text-fg-3">Preview</div>
            <div className="prose-notion min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      ) : page.content_md.trim() ? (
        <div className="prose-notion" onDoubleClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <Card>
          <EmptyState mood="think" title="This page is empty" description="Write a few short paragraphs — anyone new should get it in a minute." action={<Button variant="primary" onClick={() => setEditing(true)}>Start writing</Button>} />
        </Card>
      )}
    </article>
  );
}

function SpotMdPanel({ md }: { md: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <IconTile tone="purple" size={72}>🧠</IconTile>
      <h1 className="mt-4 text-[30px] font-black leading-tight sm:text-[34px]">SPOT.md</h1>
      <p className="mt-1.5 text-[16px] font-semibold text-fg-2">
        The canonical studio context document, generated from every Spot Base page. It’s ready to use as context for an internal AI assistant later.
      </p>
      <div className="mb-4 mt-5 flex gap-2">
        <Button variant="blue" onClick={() => downloadFile("SPOT.md", md, "text/markdown")}>
          <Download className="size-4" strokeWidth={3} /> Download
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(md).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" strokeWidth={3} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl border-2 border-line bg-subtle p-5 font-mono text-[12.5px] leading-relaxed">{md}</pre>
    </div>
  );
}
