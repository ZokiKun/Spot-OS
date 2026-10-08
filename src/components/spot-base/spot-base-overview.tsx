"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, FileCode2, ImagePlus, Mail, Plus, Trash2 } from "lucide-react";
import type { KbPage } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { DEFAULT_KB_PAGES } from "@/lib/data/kb-defaults";
import { getAdapter } from "@/lib/data";
import { buildSpotMd } from "@/lib/spot-md";
import { cn, downloadFile } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/misc";
import { AttachmentList, useAttachmentUpload } from "@/components/attachments";
import { useConfirm } from "@/components/ui/confirm";

/** The four pages every collaborator should read, with the slugs older workspaces may use. */
export const CORE_PAGES = [
  { key: "what", label: "What", slugs: ["what-we-do"] },
  { key: "why", label: "Why", slugs: ["why-we-exist", "who-we-are"] },
  { key: "how", label: "How", slugs: ["how-we-work", "methodology"] },
  { key: "ethos", label: "Ethos", slugs: ["ethos", "philosophy"] },
] as const;
export const TEAM_SLUG = "team";
export const BRAND_SLUG = "brand";

const excerpt = (md: string) =>
  md
    .replace(/^#+\s.*$/gm, "")
    .replace(/[*_`>|#-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

export function findPage(pages: KbPage[], slugs: readonly string[]) {
  for (const s of slugs) {
    const p = pages.find((x) => x.slug === s);
    if (p) return p;
  }
  return undefined;
}

/** Create a Spot Base page from its starter template (or blank). */
export function useEnsurePage() {
  const { data, create, me } = useWorkspace();
  return async (slug: string) => {
    const existing = data.kb_pages.find((p) => p.slug === slug);
    if (existing) return existing;
    const tpl = DEFAULT_KB_PAGES.find((p) => p.slug === slug);
    return create("kb_pages", {
      slug,
      title: tpl?.title ?? slug,
      icon: tpl?.icon ?? "📄",
      content_md: tpl?.content_md ?? "",
      sort_order: Math.max(0, ...data.kb_pages.map((p) => p.sort_order)) + 1,
      updated_by: me?.id ?? null,
    });
  };
}

export function SpotBaseOverview({ pages, workspaceName }: { pages: KbPage[]; workspaceName: string }) {
  return (
    <div className="space-y-10">
      <div>
        <div className="mb-2 text-[44px] leading-none">🟠</div>
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">Spot Base</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-fg-2">
          Everything someone needs to understand {workspaceName}: who we are, what we do and why, how we work, and the brand assets to do it with.
        </p>
      </div>
      <TeamSection pages={pages} />
      <CoreSection pages={pages} />
      <BrandSection pages={pages} workspaceName={workspaceName} />
    </div>
  );
}

function TeamSection({ pages }: { pages: KbPage[] }) {
  const { data } = useWorkspace();
  const team = pages.find((p) => p.slug === TEAM_SLUG);
  const ensure = useEnsurePage();
  const router = useRouter();
  return (
    <section>
      <SectionHeading
        action={
          <button
            type="button"
            onClick={async () => router.push(`/spot-base/${(await ensure(TEAM_SLUG)).slug}`)}
            className="rounded px-1 hover:bg-hover"
          >
            {team ? "Open team page" : "Write a team page"}
          </button>
        }
      >
        👥 Team
      </SectionHeading>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {data.profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg px-3.5 py-3 shadow-[0_0_0_1px_var(--border)]">
            <Avatar profile={p} size={40} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold">{p.full_name}</div>
              <div className="truncate text-[13px] text-fg-2">{p.role_title ?? "Member"}</div>
              <a href={`mailto:${p.email}`} className="flex items-center gap-1 truncate text-[12px] text-fg-3 hover:text-accent">
                <Mail className="size-3" /> {p.email}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoreSection({ pages }: { pages: KbPage[] }) {
  const ensure = useEnsurePage();
  const router = useRouter();
  return (
    <section>
      <SectionHeading>✳️ What · Why · How · Ethos</SectionHeading>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {CORE_PAGES.map((c) => {
          const page = findPage(pages, c.slugs);
          const text = page ? excerpt(page.content_md) : "";
          return page ? (
            <Link key={c.key} href={`/spot-base/${page.slug}`} className="group flex min-h-[132px] flex-col rounded-lg p-4 shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-hover">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">{c.label}</div>
              <div className="mt-1 flex items-center gap-2 text-[16px] font-semibold">
                <span>{page.icon}</span> {page.title}
              </div>
              <p className="mt-1.5 line-clamp-3 text-[13px] text-fg-2">{text || "Empty — click to write."}</p>
              <ArrowRight className="mt-auto size-4 self-end text-fg-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button
              key={c.key}
              type="button"
              onClick={async () => router.push(`/spot-base/${(await ensure(c.slugs[0])).slug}?edit=1`)}
              className="flex min-h-[132px] flex-col items-start rounded-lg border border-dashed border-line-strong p-4 text-left transition-colors hover:bg-hover"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">{c.label}</div>
              <div className="mt-1 text-[16px] font-semibold text-fg-2">Not written yet</div>
              <span className="mt-auto inline-flex items-center gap-1 text-[13px] text-accent">
                <Plus className="size-3.5" /> Start from a template
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BrandSection({ pages, workspaceName }: { pages: KbPage[]; workspaceName: string }) {
  const { data, remove } = useWorkspace();
  const ask = useConfirm();
  const brand = pages.find((p) => p.slug === BRAND_SLUG);
  const ensure = useEnsurePage();
  const files = brand ? data.attachments.filter((a) => a.kb_page_id === brand.id) : [];
  const logos = files.filter((a) => a.mime_type.startsWith("image/"));
  const others = files.filter((a) => !a.mime_type.startsWith("image/"));
  const logoInput = useRef<HTMLInputElement>(null);
  const logoUpload = useAttachmentUpload({ kb_page_id: brand?.id }, "spot-base/brand");

  return (
    <section>
      <SectionHeading
        action={
          brand && (
            <Link href={`/spot-base/${brand.slug}`} className="rounded px-1 hover:bg-hover">
              Brand guidelines
            </Link>
          )
        }
      >
        🎨 Brand assets
      </SectionHeading>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Link href="/spot-base/spot-md" className="group flex items-start gap-3 rounded-lg p-4 shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-hover">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-subtle shadow-[inset_0_0_0_1px_var(--border)]">
            <FileCode2 className="size-5 text-fg-2" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">SPOT.md</div>
            <p className="mt-0.5 text-[13px] text-fg-2">The studio context document, generated from every Spot Base page.</p>
          </div>
          <IconButton
            label="Download SPOT.md"
            size="md"
            onClick={(e) => {
              e.preventDefault();
              downloadFile("SPOT.md", buildSpotMd(pages, workspaceName), "text/markdown");
            }}
          >
            <Download className="size-4" />
          </IconButton>
        </Link>

        <div className="rounded-lg p-4 shadow-[0_0_0_1px_var(--border)]">
          <div className="mb-2 flex items-center">
            <span className="text-[15px] font-semibold">Logo & marks</span>
            <Button
              variant="ghost"
              className="ml-auto"
              disabled={logoUpload.busy}
              onClick={() => (brand ? logoInput.current?.click() : void ensure(BRAND_SLUG))}
            >
              <ImagePlus className="size-3.5" /> {logoUpload.busy ? "Uploading…" : brand ? "Upload" : "Set up"}
            </Button>
          </div>
          {logos.length === 0 ? (
            <button
              type="button"
              onClick={() => (brand ? logoInput.current?.click() : void ensure(BRAND_SLUG))}
              className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-line-strong text-[13px] text-fg-3 hover:bg-hover"
            >
              {brand ? "Upload the logo (SVG or PNG)" : "Set up brand assets"}
            </button>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {logos.map((a, i) => (
                <div key={a.id} className={cn("group relative flex h-24 items-center justify-center overflow-hidden rounded-md p-3 shadow-[inset_0_0_0_1px_var(--border)]", i % 2 ? "bg-[#191919]" : "bg-white")}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads (data URLs / signed URLs) */}
                  <img src={a.url} alt={a.name} className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-x-1 bottom-1 hidden items-center gap-0.5 rounded bg-elevated/95 px-1 shadow-card group-hover:flex">
                    <span className="min-w-0 flex-1 truncate text-[11px]">{a.name}</span>
                    <a href={a.url} download={a.name} title="Download" className="flex size-5 items-center justify-center rounded text-fg-2 hover:bg-hover">
                      <Download className="size-3" />
                    </a>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => {
                        void ask({ title: `Delete ${a.name}?` }).then((ok) => {
                          if (!ok) return;
                          void remove("attachments", a.id);
                          void getAdapter().removeFile(a.storage_path);
                        });
                      }}
                      className="flex size-5 items-center justify-center rounded text-fg-2 hover:bg-hover"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <input
            ref={logoInput}
            type="file"
            accept="image/*,.svg"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void logoUpload.run(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg p-4 shadow-[0_0_0_1px_var(--border)]">
        <div className="mb-1 text-[15px] font-semibold">Brand files</div>
        <p className="mb-2 text-[13px] text-fg-2">Fonts, colour palettes, guidelines PDFs, templates. Big files belong in Drive — add them to Library instead.</p>
        {brand ? (
          <AttachmentList items={others} owner={{ kb_page_id: brand.id }} folder="spot-base/brand" compact />
        ) : (
          <Button onClick={() => void ensure(BRAND_SLUG)}>
            <Plus className="size-3.5" /> Set up brand assets
          </Button>
        )}
      </div>
    </section>
  );
}
