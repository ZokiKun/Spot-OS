"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Download, Ellipsis, Eye, EyeOff, Trash2 } from "lucide-react";
import type { Review } from "@/directions/d2/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { periodMetrics } from "@/directions/d2/lib/selectors";
import { financeKey, periodLabel, periodParts, periodRange, reviewProgress, reviewSteps, type ReviewField, type ReviewStep } from "@/directions/d2/lib/reviews";
import { useFinance } from "@/directions/d2/lib/finance/use-finance";
import { useDebouncedSave } from "@/directions/d2/lib/hooks";
import { cn, downloadFile, firstName, timeAgo } from "@/directions/d2/lib/utils";
import { Page, PageTitle } from "@/directions/d2/components/shell/page";
import { AutoTextarea } from "@/directions/d2/components/ui/input";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { MenuItem, MenuList } from "@/directions/d2/components/ui/menu";
import { Card, CircleButton, Eyebrow, MUTED, PillButton, SOFT, type Tone } from "@/directions/d2/components/ui/chunk";
import { Money, useMoneyVisible } from "@/directions/d2/components/home/money";

export function ReviewDetail({ id }: { id: string }) {
  // useSearchParams (the `?step=` param) needs a Suspense boundary.
  return (
    <Suspense>
      <ReviewDetailInner id={id} />
    </Suspense>
  );
}

function ReviewDetailInner({ id }: { id: string }) {
  const { data, status, remove } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fin = useFinance();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover();
  const stepsRef = useRef<HTMLDivElement>(null);
  const review = data.reviews.find((r) => r.id === id);

  if (status === "ready" && !review)
    return (
      <Page width="doc" crumbs={[{ label: "Reviews", href: "/reviews" }, { label: "Not found" }]}>
        <Card tone="cream" className="items-start gap-2 p-8">
          <div className="text-[22px] font-medium tracking-[-0.02em]">This review doesn’t exist</div>
          <p className="text-[14px] text-[var(--on-chunk-2)]">It may have been deleted.</p>
          <Link href="/reviews" className="mt-3 inline-flex h-10 items-center rounded-full bg-[#151515] px-5 text-[14px] text-[#f7f3ea]">
            Back to reviews
          </Link>
        </Card>
      </Page>
    );

  const label = review ? periodLabel(review.period, review.period_start) : "…";
  const parts = review ? periodParts(review.period, review.period_start) : null;
  const [start, end] = review ? periodRange(review.period, review.period_start) : ["", ""];
  const m = review ? periodMetrics(data, start, end) : null;
  const list = review?.period === "month" ? fin.summary?.months : fin.summary?.quarters;
  const f = review ? list?.find((x) => x.key === financeKey(review.period, review.period_start)) : undefined;
  const steps = review ? reviewSteps(review.period) : [];
  const stepN = Math.min(Math.max(Number(params.get("step")) || 1, 1), Math.max(steps.length, 1));
  const step = steps[stepN - 1];

  const goTo = (n: number) => {
    // Native history keeps the step in the URL without a server round trip.
    window.history.replaceState(null, "", `${pathname}?step=${n}`);
    stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportMd = () => {
    if (!review || !m) return;
    const body = reviewSteps(review.period)
      .map(
        (s) =>
          `## ${s.n} · ${s.title}\n\n` +
          s.fields.map((fl) => `### ${fl.label}\n\n_${fl.hint}_\n\n${review[fl.key]?.trim() || "_—_"}`).join("\n\n"),
      )
      .join("\n\n");
    const nums = `| Metric | Value |\n| --- | --- |\n| Projects started | ${m.projectsStarted} |\n| Projects completed | ${m.projectsCompleted} |\n| Tasks completed | ${m.tasksCompleted} |\n| Overdue tasks | ${m.overdueTasks} |`;
    downloadFile(`review-${review.period}-${review.period_start}.md`, `# ${label} review\n\n${nums}\n\n${body}\n`, "text/markdown");
  };

  const editor = review ? people.get(review.updated_by) : undefined;

  return (
    <Page
      width="doc"
      crumbs={[{ label: "Reviews", href: "/reviews" }, { label }]}
      actions={
        review && (
          <>
            <CircleButton ref={menuAnchorRef} label="More" size={44} onClick={menu.toggle}>
              <Ellipsis />
            </CircleButton>
            <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={210}>
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
      {review && m && parts && step && (
        <>
          <PageTitle
            title={
              <>
                {review.period === "month" ? parts.name : `${parts.name} ${parts.year}`}
                <br />
                review
              </>
            }
            description={
              <>
                {review.period === "month" ? `Monthly review · ${parts.year}` : "Quarterly review"} · edited {timeAgo(review.updated_at)}
                {editor && <> by {firstName(editor.full_name)}</>}
              </>
            }
          />

          <section className="mb-12">
            <h2 className="text-[22px] font-medium tracking-[-0.02em]">The numbers</h2>
            <p className="mb-4 mt-1 text-[13.5px] text-fg-2">Counted automatically from Spot OS{f ? " and the finance sheet" : ""}.</p>
            <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard tone="lime" label="Tasks done" value={m.tasksCompleted} />
              <StatCard tone="sky" label="Projects finished" value={m.projectsCompleted} />
              <StatCard tone="cream" label="Projects started" value={m.projectsStarted} />
              <StatCard tone={m.overdueTasks ? "coral" : "surface"} label="Late in period" value={m.overdueTasks} />
            </div>
            <MoneyCard income={f?.income} expenses={f?.expenses} net={f?.net} currency={fin.currency} hasData={!!f} />
          </section>

          <div ref={stepsRef} className="scroll-mt-24">
            <StepPills steps={steps} review={review} current={stepN} onChange={goTo} />
            <div key={step.n} className="anim-fade mt-6">
              <h2 className="text-[26px] font-medium leading-tight tracking-[-0.025em]">{step.title}</h2>
              <p className="mt-1 text-[14px] text-fg-2">{step.helper}</p>
              <div className="stagger mt-5 grid gap-3">
                {step.fields.map((field) => (
                  <ReviewSection key={field.key} review={review} field={field} tone={step.tone} />
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2">
              {step.n > 1 && (
                <PillButton tone="outline" size="lg" onClick={() => goTo(step.n - 1)}>
                  <ArrowLeft /> Back
                </PillButton>
              )}
              <PillButton
                size="lg"
                className="ml-auto"
                onClick={() => (step.n < steps.length ? goTo(step.n + 1) : router.push("/reviews"))}
              >
                {step.n < steps.length ? (
                  <>
                    Next <ArrowRight />
                  </>
                ) : (
                  <>
                    <Check /> Done
                  </>
                )}
              </PillButton>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function StatCard({ tone, label, value }: { tone: Tone; label: string; value: ReactNode }) {
  return (
    <Card tone={tone} className="min-h-[128px]">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-auto pt-4 text-[40px] font-medium leading-none tracking-[-0.04em] tabular">{value}</div>
    </Card>
  );
}

/** Money stays private (ink) and hidden until someone taps the eye. */
function MoneyCard({
  income,
  expenses,
  net,
  currency,
  hasData,
}: {
  income?: number;
  expenses?: number;
  net?: number;
  currency: string;
  hasData: boolean;
}) {
  const { visible, setVisible } = useMoneyVisible();
  const rows: [string, number | undefined][] = [
    ["Revenue", income],
    ["Expenses", expenses],
    ["Net", net],
  ];
  return (
    <Card tone="ink" className="mt-3 p-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-medium">Money</div>
          <div className={cn("text-[12.5px]", MUTED.ink)}>{hasData ? (visible ? "From the finance sheet" : "Hidden — tap the eye to show") : "No finance data for this period"}</div>
        </div>
        <CircleButton
          label={visible ? "Hide amounts" : "Show amounts"}
          aria-pressed={visible}
          tone="ghost"
          size={44}
          className="bg-white/10"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </CircleButton>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map(([l, v]) => (
          <div key={l} className={cn("flex items-baseline justify-between gap-3 rounded-[22px] px-4 py-3.5 sm:flex-col sm:items-start sm:gap-1", SOFT.ink)}>
            <span className={cn("text-[12.5px]", MUTED.ink)}>{l}</span>
            <span className={cn("text-[22px] font-medium leading-tight tracking-[-0.02em] tabular", visible && l === "Net" && (v ?? 0) < 0 && "text-coral")}>
              <Money value={v ?? null} currency={currency} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StepPills({ steps, review, current, onChange }: { steps: ReviewStep[]; review: Review; current: number; onChange: (n: number) => void }) {
  return (
    <div role="tablist" aria-label="Review steps" className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {steps.map((s) => {
        const selected = s.n === current;
        const { filled, total } = reviewProgress(review, s.fields);
        const complete = filled === total;
        return (
          <button
            key={s.n}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(s.n)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2.5 rounded-full pl-4 pr-1.5 text-[14px] transition-[background,color,box-shadow] duration-150",
              selected
                ? "bg-accent text-on-accent"
                : "text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg hover:shadow-[inset_0_0_0_1.5px_var(--text-3)]",
            )}
          >
            <span>
              {s.n} · {s.title}
            </span>
            {complete ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-lime text-on-chunk" aria-label="All answered">
                <Check className="size-3.5" />
              </span>
            ) : (
              <span
                className={cn("flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[12px] tabular", selected ? "bg-on-accent/15" : "bg-hover")}
                aria-label={`${filled} of ${total} answered`}
              >
                {filled}/{total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ReviewSection({ review, field, tone }: { review: Review; field: ReviewField; tone: Tone }) {
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
    <Card tone={tone} className="p-6">
      <Eyebrow>{field.label}</Eyebrow>
      <h3 className="mt-1 text-[21px] font-medium leading-[1.2] tracking-[-0.02em]">{field.hint}</h3>
      <label className={cn("mt-4 block cursor-text rounded-[22px] px-4 py-3.5 [--text-3:var(--on-chunk-2)]", SOFT[tone])}>
        <span className="sr-only">{field.hint}</span>
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
          placeholder="Write a few lines…"
          className="block min-h-[96px] text-[16px] leading-relaxed"
        />
      </label>
    </Card>
  );
}
