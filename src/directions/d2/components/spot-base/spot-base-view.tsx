"use client";

import { useMemo } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useWorkspace } from "@/directions/d2/lib/store";
import { DEFAULT_KB_PAGES } from "@/directions/d2/lib/data/kb-defaults";
import { cn, timeAgo } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { Card, CircleButton, MUTED, SOFT, TONE } from "@/directions/d2/components/ui/chunk";
import { DARK_PILL, SPOT_MD, mdToPlain, sortPages, toneForIndex, useAddKbPage } from "./kb-utils";
import { KbPageView } from "./kb-page-view";
import { SpotMdView } from "./spot-md-view";

/** /spot-base → index of pages, /spot-base/spot-md → SPOT.md, /spot-base/[slug] → one page. */
export function SpotBaseView({ slug }: { slug?: string }) {
  if (slug === SPOT_MD) return <SpotMdView />;
  if (slug) return <KbPageView key={slug} slug={slug} />;
  return <SpotBaseIndex />;
}

function SpotBaseIndex() {
  const { data, create, me } = useWorkspace();
  const pages = useMemo(() => sortPages(data.kb_pages), [data.kb_pages]);
  const addPage = useAddKbPage(pages);

  return (
    <Page crumbs={[{ label: "Spot Base" }]}>
      <PageTitle
        title={
          <>
            Spot
            <br />
            Base
          </>
        }
        description="Everything about how the studio works, in one place."
        aside={
          pages.length > 0 && (
            <CircleButton label="Add page" tone="ink" size={52} onClick={() => void addPage()} className="max-sm:hidden">
              <Plus />
            </CircleButton>
          )
        }
      />

      {pages.length === 0 ? (
        <div className={cn("anim-rise mx-auto flex max-w-[560px] flex-col items-center rounded-[28px] px-8 py-10 text-center", TONE.cream)}>
          <div className="text-[40px] leading-none">📚</div>
          <div className="mt-4 text-[24px] font-medium tracking-[-0.02em]">Spot Base is empty</div>
          <p className={cn("mt-2 max-w-[400px] text-[14px] leading-relaxed", MUTED.cream)}>
            Start with a ready-made outline: who we are, positioning, brand, how we work, team, services, tools and file naming.
          </p>
          <button
            type="button"
            className={cn(DARK_PILL, "mt-5")}
            onClick={() => DEFAULT_KB_PAGES.forEach((p, i) => void create("kb_pages", { ...p, sort_order: i, updated_by: me?.id ?? null }))}
          >
            Add starter pages
          </button>
          <button type="button" onClick={() => void addPage()} className={cn("mt-2 h-9 rounded-full px-4 text-[13.5px] hover:bg-[var(--chunk-soft)]", MUTED.cream)}>
            or start from a blank page
          </button>
        </div>
      ) : (
        <>
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p, i) => {
              const tone = toneForIndex(i);
              const preview = mdToPlain(p.content_md);
              return (
                <Card key={p.id} tone={tone} href={`/spot-base/${p.slug}`} className="min-h-[216px]">
                  <span className={cn("flex size-12 items-center justify-center rounded-full text-[24px] leading-none", SOFT[tone])}>{p.icon ?? "📄"}</span>
                  <div className="mt-4 line-clamp-2 text-[20px] font-medium leading-[1.15] tracking-[-0.02em]">{p.title || "Untitled"}</div>
                  <p className={cn("mt-1.5 line-clamp-2 text-[13.5px] leading-snug", MUTED[tone], !preview && "italic")}>{preview || "Nothing written yet."}</p>
                  <div className={cn("mt-auto pt-4 text-[12.5px]", MUTED[tone])}>Edited {timeAgo(p.updated_at)}</div>
                </Card>
              );
            })}
            <button
              type="button"
              onClick={() => void addPage()}
              className="press flex min-h-[216px] flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-line-strong text-fg-2 transition-colors hover:border-fg-3 hover:text-fg"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-elevated">
                <Plus className="size-5" />
              </span>
              <span className="text-[15px] font-medium">Add page</span>
            </button>
          </div>

          <Card tone="ink" href={`/spot-base/${SPOT_MD}`} className="mt-6">
            <span className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[24px] leading-none">🧠</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[20px] font-medium tracking-[-0.02em]">SPOT.md</span>
                <span className={cn("block text-[13.5px]", MUTED.ink)}>The whole Spot Base as one file for AI tools</span>
              </span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <ArrowUpRight className="size-[18px]" />
              </span>
            </span>
          </Card>
        </>
      )}

      {pages.length > 0 && (
        <CircleButton label="Add page" tone="ink" size={60} onClick={() => void addPage()} className="fixed bottom-24 right-5 z-20 shadow-menu sm:hidden">
          <Plus />
        </CircleButton>
      )}
    </Page>
  );
}
