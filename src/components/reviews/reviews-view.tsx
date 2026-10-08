"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus } from "lucide-react";
import type { ReviewPeriod } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { usePageAdd } from "@/components/shell/quick-add";
import { isReviewStarted, periodLabel, recentPeriods } from "@/lib/reviews";
import { timeAgo } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { StatusTag } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";

export function ReviewsView() {
  const { data, create, me } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const { setAnchor: popAnchorRef, ...pop } = usePopover();
  usePageAdd("New review", () => pop.setOpen(true));

  const existing = new Set(data.reviews.map((r) => `${r.period}:${r.period_start}`));
  const open = async (period: ReviewPeriod, start: string) => {
    pop.close();
    const found = data.reviews.find((r) => r.period === period && r.period_start === start);
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

  return (
    <Page
      crumbs={[{ label: "Reviews", icon: <ClipboardCheck className="size-4" /> }]}
      actions={
        <>
          <Button ref={popAnchorRef} variant="primary" onClick={pop.toggle} title="New review (Shift+A)">
            <Plus className="size-3.5" /> New review
          </Button>
          <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={240}>
            <MenuList>
              <MenuLabel>Monthly</MenuLabel>
              {months.map((m) => (
                <MenuItem key={m} onSelect={() => void open("month", m)} hint={existing.has(`month:${m}`) ? "Open" : undefined}>
                  {periodLabel("month", m)}
                </MenuItem>
              ))}
              <MenuDivider />
              <MenuLabel>Quarterly</MenuLabel>
              {quarters.map((q) => (
                <MenuItem key={q} onSelect={() => void open("quarter", q)} hint={existing.has(`quarter:${q}`) ? "Open" : undefined}>
                  {periodLabel("quarter", q)}
                </MenuItem>
              ))}
            </MenuList>
          </Popover>
        </>
      }
    >
      <PageTitle
        icon="🪞"
        title="Reviews"
        description="Monthly and quarterly look-backs. Spot OS fills in the numbers; you write what they mean."
      />
      {(["month", "quarter"] as const).map((period) => {
        const list = data.reviews.filter((r) => r.period === period).sort((a, b) => b.period_start.localeCompare(a.period_start));
        const suggested = (period === "month" ? months.slice(0, 2) : quarters.slice(0, 2)).find((p) => !existing.has(`${period}:${p}`));
        return (
          <section key={period} className="mb-10">
            <SectionHeading
              action={
                suggested && (
                  <button type="button" onClick={() => void open(period, suggested)} className="rounded px-1.5 text-accent hover:bg-hover">
                    + {periodLabel(period, suggested)}
                  </button>
                )
              }
            >
              {period === "month" ? "Monthly" : "Quarterly"}
            </SectionHeading>
            {list.length === 0 ? (
              <EmptyState title={`No ${period === "month" ? "monthly" : "quarterly"} reviews yet`} className="border-y border-line py-6" />
            ) : (
              <div className="border-t border-line">
                {list.map((r) => {
                  const started = isReviewStarted(r);
                  return (
                    <Link key={r.id} href={`/reviews/${r.id}`} className="flex h-11 items-center gap-3 border-b border-line px-2 hover:bg-hover">
                      <span className="w-40 shrink-0 text-[14px] font-medium">{periodLabel(r.period, r.period_start)}</span>
                      <StatusTag color={started ? "green" : "default"}>{started ? "Written" : "Not started"}</StatusTag>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">{r.wins.split("\n")[0]}</span>
                      <Avatar profile={people.get(r.updated_by)} size={18} />
                      <span className="w-24 shrink-0 text-right text-[12px] text-fg-3">{timeAgo(r.updated_at)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </Page>
  );
}
