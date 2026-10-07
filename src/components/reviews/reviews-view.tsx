"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";
import { ArrowRight, Check, Plus } from "lucide-react";
import type { Review, ReviewPeriod } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { duePeriod, periodLabel, periodParts, recentPeriods, reviewProgress } from "@/lib/reviews";
import { cn, firstName, parseDate, timeAgo } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Card, Chip, CircleButton, MUTED, PillButton, PillTabs, Ring, SOFT, type Tone } from "@/components/ui/chunk";

const WORD: Record<ReviewPeriod, { adj: string; noun: string }> = {
  month: { adj: "Monthly", noun: "month" },
  quarter: { adj: "Quarterly", noun: "quarter" },
};

export function ReviewsView() {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  const { setAnchor: popAnchorRef, ...pop } = usePopover();
  const [tab, setTab] = useState<ReviewPeriod>("month");

  const find = (period: ReviewPeriod, start: string) => data.reviews.find((r) => r.period === period && r.period_start === start);
  const open = async (period: ReviewPeriod, start: string) => {
    pop.close();
    const found = find(period, start);
    if (found) return router.push(`/reviews/${found.id}`);
    const r = await create("reviews", {
      period,
      period_start: start,
      planned: "",
      done: "",
      not_done: "",
      reasons: "",
      wins: "",
      problems: "",
      lessons: "",
      next_period: "",
      numbers: "",
      created_by: me?.id ?? null,
      updated_by: me?.id ?? null,
    });
    router.push(`/reviews/${r.id}`);
  };

  const months = recentPeriods("month", 4);
  const quarters = recentPeriods("quarter", 3);
  const due = (["month", "quarter"] as const).flatMap((period) => {
    const start = duePeriod(period);
    return start ? [{ period, start, review: find(period, start) }] : [];
  });

  const byPeriod = (period: ReviewPeriod) =>
    data.reviews.filter((r) => r.period === period).sort((a, b) => b.period_start.localeCompare(a.period_start));
  const list = byPeriod(tab);

  return (
    <Page width="wide" crumbs={[{ label: "Reviews" }]}>
      <PageTitle
        title="Reviews"
        description="Look back once a month and once a quarter. Spot OS fills in the numbers; you write what they mean."
        aside={
          <>
            <CircleButton ref={popAnchorRef} label="New review" tone="ink" size={48} onClick={pop.toggle}>
              <Plus />
            </CircleButton>
            <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={240}>
              <MenuList>
                <MenuLabel>Monthly</MenuLabel>
                {months.map((m) => (
                  <MenuItem key={m} onSelect={() => void open("month", m)} hint={find("month", m) ? "Open" : undefined}>
                    {periodLabel("month", m)}
                  </MenuItem>
                ))}
                <MenuDivider />
                <MenuLabel>Quarterly</MenuLabel>
                {quarters.map((q) => (
                  <MenuItem key={q} onSelect={() => void open("quarter", q)} hint={find("quarter", q) ? "Open" : undefined}>
                    {periodLabel("quarter", q)}
                  </MenuItem>
                ))}
              </MenuList>
            </Popover>
          </>
        }
      />

      {due.length > 0 && (
        <div className={cn("stagger mb-10 grid grid-cols-1 gap-3", due.length > 1 && "md:grid-cols-2")}>
          {due.map((d) => (
            <DueCard key={d.period} period={d.period} start={d.start} review={d.review} onOpen={() => void open(d.period, d.start)} />
          ))}
        </div>
      )}

      <PillTabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "month", label: "Monthly", count: byPeriod("month").length },
          { value: "quarter", label: "Quarterly", count: byPeriod("quarter").length },
        ]}
      />

      {list.length === 0 ? (
        <Card className="items-start gap-2 p-8">
          <div className="text-[22px] font-medium tracking-[-0.02em]">No {WORD[tab].adj.toLowerCase()} reviews yet</div>
          <p className="max-w-md text-[14px] text-fg-2">Start with the last {WORD[tab].noun}. It takes about 15 minutes.</p>
          <PillButton className="mt-3" onClick={() => void open(tab, (tab === "month" ? months : quarters)[1])}>
            <Plus /> Start a review
          </PillButton>
        </Card>
      ) : (
        <div key={tab} className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </Page>
  );
}

/** The one review that's due now: a call to action until it's written, then a quiet "done". */
function DueCard({ period, start, review, onOpen }: { period: ReviewPeriod; start: string; review?: Review; onOpen: () => void }) {
  const { name } = periodParts(period, start);
  const label = period === "month" ? name : periodLabel(period, start);
  const progress = review ? reviewProgress(review) : { filled: 0, total: 0 };
  const done = !!review && progress.filled === progress.total;
  const started = progress.filled > 0;
  const tone: Tone = done ? "lime" : period === "month" ? "sun" : "sky";

  return (
    <Card tone={tone} handle className="min-h-[200px] pt-8">
      <div className="flex items-start justify-between gap-3">
        <Chip tone={tone}>{WORD[period].adj} review</Chip>
        {started && !done && (
          <span className={cn("flex items-center gap-2 text-[12.5px] tabular", MUTED[tone])}>
            {progress.filled}/{progress.total}
            <Ring value={progress.filled / progress.total} size={30} />
          </span>
        )}
        {done && (
          <span className="flex size-9 items-center justify-center rounded-full bg-[#151515] text-[#f7f3ea]">
            <Check className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-5 text-[28px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[32px]">
        {done ? `${label} review is done` : started ? `Finish your ${label} review` : `Time for your ${label} review`}
      </div>
      <p className={cn("mt-2 max-w-md text-[14px] leading-snug", MUTED[tone])}>
        {done
          ? "Nice work. Open it any time to read it back."
          : started
            ? `${progress.total - progress.filled} ${progress.total - progress.filled === 1 ? "question" : "questions"} left. Pick up where you stopped.`
            : `Three short steps: look back, what we learned, look ahead.`}
      </p>
      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-medium transition-[background,transform] duration-150 active:scale-[0.97] [&_svg]:size-[18px]",
            done ? "bg-[var(--chunk-soft)] hover:bg-[var(--chunk-soft-2)]" : "bg-[#151515] text-[#f7f3ea] hover:bg-[#2a2a2a]",
          )}
        >
          {done ? "Open" : started ? "Continue" : "Start"} <ArrowRight />
        </button>
      </div>
    </Card>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  const people = useProfiles();
  const { filled, total } = reviewProgress(r);
  const tone: Tone = filled > 0 ? "cream" : "surface";
  const { name, year } = periodParts(r.period, r.period_start);
  const editor = people.get(r.updated_by);
  const preview = r.wins.trim().split("\n")[0];
  const d = parseDate(r.period_start);
  const range = r.period === "quarter" && d ? `${format(d, "MMM")} – ${format(addMonths(d, 2), "MMM")}` : null;

  return (
    <Card tone={tone} href={`/reviews/${r.id}`} className="min-h-[220px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[30px] font-medium leading-none tracking-[-0.035em]">{name}</div>
          <div className={cn("mt-1.5 text-[13px]", MUTED[tone])}>
            {year}
            {range && ` · ${range}`}
          </div>
        </div>
        {filled === total ? (
          <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-lime px-3 text-[12.5px] text-on-chunk">
            <Check className="size-3.5" /> Written
          </span>
        ) : (
          <Chip tone={tone}>{filled === 0 ? "Not started" : `${filled} of ${total} answered`}</Chip>
        )}
      </div>
      <div className={cn("mt-4 rounded-[18px] px-3.5 py-2.5", SOFT[tone])}>
        <div className={cn("text-[11.5px]", MUTED[tone])}>Wins</div>
        <div className={cn("truncate text-[13.5px] leading-snug", !preview && "opacity-60")}>{preview || "Nothing written yet"}</div>
      </div>
      <div className={cn("mt-auto flex items-center gap-2 pt-4 text-[12.5px]", MUTED[tone])}>
        <Avatar profile={editor} size={26} />
        <span className="truncate">
          {editor ? `${firstName(editor.full_name)} · ` : ""}edited {timeAgo(r.updated_at)}
        </span>
      </div>
    </Card>
  );
}
