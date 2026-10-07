"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Download, Ellipsis, Trash2 } from "lucide-react";
import type { Review } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { periodMetrics } from "@/lib/selectors";
import { financeKey, periodLabel, periodRange, reviewFields, type ReviewField } from "@/lib/reviews";
import { useFinance } from "@/lib/finance/use-finance";
import { useDebouncedSave } from "@/lib/hooks";
import { downloadFile, timeAgo } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { AutoTextarea } from "@/components/ui/input";
import { IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuItem, MenuList } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/misc";
import { StatRow } from "@/components/insights/stat-row";
import { Money, RevealToggle } from "@/components/insights/money";

export function ReviewDetail({ id }: { id: string }) {
  const { data, status, remove } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const fin = useFinance();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover();
  const review = data.reviews.find((r) => r.id === id);
  const crumbIcon = <ClipboardCheck className="size-4" />;

  if (status === "ready" && !review)
    return (
      <Page crumbs={[{ label: "Reviews", href: "/reviews", icon: crumbIcon }]}>
        <EmptyState title="Review not found" action={<Link href="/reviews" className="text-accent">Back to reviews</Link>} />
      </Page>
    );

  const label = review ? periodLabel(review.period, review.period_start) : "…";
  const [start, end] = review ? periodRange(review.period, review.period_start) : ["", ""];
  const m = review ? periodMetrics(data, start, end) : null;
  const list = review?.period === "month" ? fin.summary?.months : fin.summary?.quarters;
  const f = review ? list?.find((x) => x.key === financeKey(review.period, review.period_start)) : undefined;

  const exportMd = () => {
    if (!review || !m) return;
    const body = reviewFields(review.period)
      .map((fl) => `## ${fl.label}\n\n${review[fl.key]?.trim() || "_—_"}`)
      .join("\n\n");
    const nums = `| Metric | Value |\n| --- | --- |\n| Projects started | ${m.projectsStarted} |\n| Projects completed | ${m.projectsCompleted} |\n| Tasks completed | ${m.tasksCompleted} |\n| Overdue tasks | ${m.overdueTasks} |`;
    downloadFile(`review-${review.period}-${review.period_start}.md`, `# ${label} review\n\n${nums}\n\n${body}\n`, "text/markdown");
  };

  return (
    <Page
      width="doc"
      crumbs={[
        { label: "Reviews", href: "/reviews", icon: crumbIcon },
        { label },
      ]}
      actions={
        review && (
          <>
            <span className="mr-1 hidden text-[13px] text-fg-3 sm:inline">
              Edited {timeAgo(review.updated_at)} by {people.get(review.updated_by)?.full_name ?? "someone"}
            </span>
            <IconButton ref={menuAnchorRef} label="More" size="md" onClick={menu.toggle}>
              <Ellipsis className="size-4" />
            </IconButton>
            <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={200}>
              <MenuList>
                <MenuItem icon={<Download className="size-4" />} onSelect={() => (exportMd(), menu.close())}>
                  Export as Markdown
                </MenuItem>
                <MenuItem
                  danger
                  icon={<Trash2 className="size-4" />}
                  onSelect={() => {
                    if (confirm(`Delete the ${label} review?`)) {
                      void remove("reviews", review.id);
                      router.push("/reviews");
                    }
                  }}
                >
                  Delete review
                </MenuItem>
              </MenuList>
            </Popover>
          </>
        )
      }
    >
      {review && m && (
        <>
          <div className="mb-2 text-[44px] leading-none">{review.period === "month" ? "🗓️" : "📊"}</div>
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">{label} review</h1>
          <p className="mt-1.5 text-[15px] text-fg-2">{review.period === "month" ? "Monthly review" : "Quarterly review"}</p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-fg-2">Calculated from Spot OS{f ? " and the finance sheet" : ""}</span>
              <RevealToggle />
            </div>
            <StatRow
              stats={[
                { label: "Projects started", value: m.projectsStarted },
                { label: "Projects completed", value: m.projectsCompleted },
                { label: "Tasks completed", value: m.tasksCompleted },
                { label: "Overdue in period", value: m.overdueTasks, tone: m.overdueTasks ? "danger" : "default" },
              ]}
            />
            <StatRow
              className="mt-2"
              stats={[
                { label: "Revenue", value: <Money value={f?.income ?? null} currency={fin.currency} /> },
                { label: "Expenses", value: <Money value={f?.expenses ?? null} currency={fin.currency} /> },
                { label: "Net", value: <Money value={f?.net ?? null} currency={fin.currency} /> },
              ]}
            />
          </div>

          <div className="mt-10 space-y-7">
            {reviewFields(review.period).map((field) => (
              <ReviewSection key={field.key} review={review} field={field} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

function ReviewSection({ review, field }: { review: Review; field: ReviewField }) {
  const { update, me } = useWorkspace();
  const [value, setValue] = useState(review[field.key] ?? "");
  const [focused, setFocused] = useState(false);
  const { schedule, flush } = useDebouncedSave<string>((v) => void update("reviews", review.id, { [field.key]: v, updated_by: me?.id ?? null }), 800);

  // Take remote edits when not typing here (last write wins).
  const remote = review[field.key] ?? "";
  const [seen, setSeen] = useState(remote);
  if (!focused && remote !== seen) {
    setSeen(remote);
    setValue(remote);
  }

  return (
    <section>
      <h2 className="mb-1 text-[20px] font-semibold">{field.label}</h2>
      <AutoTextarea
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          flush();
        }}
        onChange={(e) => {
          setValue(e.target.value);
          schedule(e.target.value);
        }}
        placeholder={field.hint}
        className="min-h-[28px] text-[16px] leading-relaxed"
      />
    </section>
  );
}
