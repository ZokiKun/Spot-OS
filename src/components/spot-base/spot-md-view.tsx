"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { buildSpotMd } from "@/lib/spot-md";
import { cn, downloadFile, plural } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { MUTED, TONE } from "@/components/ui/chunk";
import { sortPages } from "./kb-utils";

/** SPOT.md: every Spot Base page stitched into one Markdown file for AI tools. */
export function SpotMdView() {
  const { data } = useWorkspace();
  const pages = useMemo(() => sortPages(data.kb_pages), [data.kb_pages]);
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";
  const md = useMemo(() => buildSpotMd(pages, workspaceName), [pages, workspaceName]);
  const [copied, setCopied] = useState(false);

  return (
    <Page width="doc" crumbs={[{ label: "Spot Base", href: "/spot-base" }, { label: "SPOT.md" }]}>
      <section className={cn("anim-rise rounded-[28px] p-7 sm:p-10", TONE.ink)}>
        <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-[34px] leading-none">🧠</span>
        <h1 className="mt-5 text-[32px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[40px]">SPOT.md</h1>
        <p className={cn("mt-2 max-w-[520px] text-[15px] leading-relaxed", MUTED.ink)}>
          The whole Spot Base as one file — {plural(pages.length, "page")} — ready to hand to an AI tool as context about the studio.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadFile("SPOT.md", md, "text/markdown")}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-on-ink px-5 text-[14px] font-medium text-ink transition-transform active:scale-[0.97]"
          >
            <Download className="size-4" /> Download
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(md).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[14px] font-medium transition-[background,transform] hover:bg-white/15 active:scale-[0.97]"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="mt-6 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[22px] bg-white/[0.07] p-5 font-mono text-[12.5px] leading-relaxed text-[var(--on-ink)] sm:p-6">{md}</pre>
      </section>
    </Page>
  );
}
