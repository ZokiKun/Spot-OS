"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Review, ReviewPeriod } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { periodLabel, recentPeriods, reviewFields } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Banner } from "@/components/ui/banner";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, IconTile, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { Mascot } from "@/components/ui/mascot";
import { StatusTag } from "@/components/ui/tag";
import { NAV_ART } from "@/components/shell/icons";
import { RailCard } from "@/components/home/rail-cards";

export const answeredCount = (r: Review) => reviewFields(r.period).filter((f) => r[f.key]?.trim()).length;

/** Find or create the review for a period, then open it. */
export function useOpenReview() {
  const { data, create, me } = useWorkspace();
  const router = useRouter();
  return async (period: ReviewPeriod, start: string) => {
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
}

/** Reviews: one clear "write this next" banner, then the history as simple cards. */
export function ReviewsView() {
  const { data } = useWorkspace();
  const open = useOpenReview();

  // The review that matters now: last month's (it's a look back), then last quarter's.
  const candidates: [ReviewPeriod, string][] = [
    ["month", recentPeriods("month", 2)[1]!],
    ["quarter", recentPeriods("quarter", 2)[1]!],
  ];
  const next = candidates.find(([period, start]) => {
    const r = data.reviews.find((x) => x.period === period && x.period_start === start);
    return !r || answeredCount(r) < reviewFields(period).length;
  });
  const nextReview = next && data.reviews.find((x) => x.period === next[0] && x.period_start === next[1]);
  const nextAnswered = nextReview ? answeredCount(nextReview) : 0;

  return (
    <Page crumbs={[{ label: "Reviews" }]} aside={<HowItWorks />}>
      <PageTitle title="Reviews" description="A short look back each month and quarter. Spot OS fills in the numbers — you say what they mean." />

      {next ? (
        <Banner
          tone="purple"
          overline={next[0] === "month" ? "Monthly review" : "Quarterly review"}
          title={periodLabel(next[0], next[1])}
          art={<NAV_ART.reviews size={76} />}
          action={
            <button type="button" onClick={() => void open(next[0], next[1])} className={buttonClasses("white", "md")}>
              {nextAnswered ? "Continue" : "Start"}
            </button>
          }
        >
          {nextAnswered
            ? `${nextAnswered} of ${reviewFields(next[0]).length} questions answered. Pick up where you left off.`
            : `${reviewFields(next[0]).length} short questions, one at a time. About 10 minutes.`}
        </Banner>
      ) : (
        <Banner tone="green" title="You’re all caught up!" art={<Mascot mood="cheer" size={96} />}>
          Last month’s and last quarter’s reviews are written.
        </Banner>
      )}

      {(["month", "quarter"] as const).map((period) => {
        const list = data.reviews.filter((r) => r.period === period).sort((a, b) => b.period_start.localeCompare(a.period_start));
        return (
          <section key={period} className="mt-10">
            <SectionHeading>{period === "month" ? "Monthly" : "Quarterly"}</SectionHeading>
            {list.length === 0 ? (
              <Card>
                <EmptyState mood="sleepy" title={`No ${period === "month" ? "monthly" : "quarterly"} reviews yet`} className="py-8" />
              </Card>
            ) : (
              <div className="space-y-3">
                {list.map((r) => {
                  const n = answeredCount(r);
                  const total = reviewFields(r.period).length;
                  return (
                    <Link key={r.id} href={`/reviews/${r.id}`} className="card-press flex items-center gap-4 rounded-2xl bg-bg px-4 py-3.5">
                      <IconTile tone={n === total ? "green" : n ? "purple" : "gray"} size={48}>
                        {period === "month" ? "🗓️" : "📊"}
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <div className="text-[16.5px] font-extrabold">{periodLabel(r.period, r.period_start)}</div>
                        {n === total ? (
                          <div className="truncate text-[13.5px] font-semibold text-fg-2">{r.wins.split("\n")[0] || "All questions answered"}</div>
                        ) : (
                          <div className="mt-1.5 flex items-center gap-2">
                            <ProgressBar value={n / total} tone="purple" size="sm" className="max-w-36" />
                            <span className="text-[12.5px] font-bold text-fg-2">
                              {n}/{total}
                            </span>
                          </div>
                        )}
                      </div>
                      <StatusTag color={n === total ? "green" : n ? "purple" : "default"}>{n === total ? "Done" : n ? "Started" : "Not started"}</StatusTag>
                      <ChevronRight className={cn("size-5 shrink-0 text-fg-3")} strokeWidth={3} />
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

function HowItWorks() {
  const steps = [
    ["📊", "Spot OS adds up the numbers", "Projects, tasks and money for the period."],
    ["💬", "You answer short questions", "One at a time. Skip any you like."],
    ["🔁", "Read it back next time", "So the same problems don’t repeat."],
  ];
  return (
    <RailCard title="How it works">
      <ol className="space-y-3 pt-1">
        {steps.map(([icon, title, sub]) => (
          <li key={title} className="flex items-start gap-3">
            <IconTile tone="purple" size={40}>
              {icon}
            </IconTile>
            <div>
              <div className="text-[14.5px] font-extrabold">{title}</div>
              <div className="text-[13px] font-semibold text-fg-2">{sub}</div>
            </div>
          </li>
        ))}
      </ol>
    </RailCard>
  );
}
