"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Ellipsis, ListChecks, Sparkles, Trash2 } from "lucide-react";
import type { Review } from "@/directions/d3/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d3/lib/store";
import { periodMetrics } from "@/directions/d3/lib/selectors";
import { financeKey, periodLabel, periodRange, reviewFields, type ReviewField } from "@/directions/d3/lib/reviews";
import { useFinance } from "@/directions/d3/lib/finance/use-finance";
import { useDebouncedSave } from "@/directions/d3/lib/hooks";
import { cn, downloadFile, timeAgo } from "@/directions/d3/lib/utils";
import { Page } from "@/directions/d3/components/shell/page";
import { AutoTextarea } from "@/directions/d3/components/ui/input";
import { Button, IconButton } from "@/directions/d3/components/ui/button";
import { Popover, usePopover } from "@/directions/d3/components/ui/popover";
import { MenuItem, MenuList } from "@/directions/d3/components/ui/menu";
import { ActionLink, Card, EmptyState, ProgressBar } from "@/directions/d3/components/ui/misc";
import { Mascot, SpeechBubble } from "@/directions/d3/components/ui/mascot";
import { useToast } from "@/directions/d3/components/ui/toast";
import { StatRow } from "@/directions/d3/components/home/stat-row";
import { Money, RevealToggle } from "@/directions/d3/components/home/money";
import { RailCard } from "@/directions/d3/components/home/rail-cards";
import { answeredCount } from "./reviews-view";

/**
 * A review, Duolingo-lesson style: one question at a time with a progress bar,
 * or flip to "All answers" to read and edit everything at once.
 */
export function ReviewDetail({ id }: { id: string }) {
  const { data, status, remove } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover();
  const review = data.reviews.find((r) => r.id === id);
  const [mode, setMode] = useState<"guided" | "all" | null>(null);

  if (status === "ready" && !review)
    return (
      <Page crumbs={[{ label: "Reviews", href: "/reviews" }, { label: "Not found" }]}>
        <Card>
          <EmptyState mood="worried" title="Review not found" action={<ActionLink href="/reviews">Back to reviews</ActionLink>} />
        </Card>
      </Page>
    );

  const label = review ? periodLabel(review.period, review.period_start) : "…";
  const fields = review ? reviewFields(review.period) : [];
  const answered = review ? answeredCount(review) : 0;
  const view = mode ?? (answered < fields.length ? "guided" : "all");

  const exportMd = () => {
    if (!review) return;
    const [start, end] = periodRange(review.period, review.period_start);
    const m = periodMetrics(data, start, end);
    const body = fields.map((fl) => `## ${fl.label}\n\n${review[fl.key]?.trim() || "_—_"}`).join("\n\n");
    const nums = `| Metric | Value |\n| --- | --- |\n| Projects started | ${m.projectsStarted} |\n| Projects completed | ${m.projectsCompleted} |\n| Tasks completed | ${m.tasksCompleted} |\n| Overdue tasks | ${m.overdueTasks} |`;
    downloadFile(`review-${review.period}-${review.period_start}.md`, `# ${label} review\n\n${nums}\n\n${body}\n`, "text/markdown");
  };

  return (
    <Page
      crumbs={[{ label: "Reviews", href: "/reviews" }, { label }]}
      aside={review && <NumbersCard review={review} />}
      actions={
        review && (
          <>
            <Button variant="secondary" onClick={() => setMode(view === "guided" ? "all" : "guided")}>
              {view === "guided" ? <ListChecks className="size-4" strokeWidth={3} /> : <Sparkles className="size-4" strokeWidth={3} />}
              {view === "guided" ? "All answers" : "Step by step"}
            </Button>
            <IconButton ref={menuAnchorRef} label="More" size="md" onClick={menu.toggle}>
              <Ellipsis className="size-5" strokeWidth={3} />
            </IconButton>
            <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={220}>
              <MenuList>
                <MenuItem icon={<Download className="size-4" strokeWidth={2.5} />} onSelect={() => (exportMd(), menu.close())}>
                  Export as Markdown
                </MenuItem>
                <MenuItem
                  danger
                  icon={<Trash2 className="size-4" strokeWidth={2.5} />}
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
      {review && (
        <>
          <div className="label-caps text-[12.5px] text-purple-edge">{review.period === "month" ? "Monthly review" : "Quarterly review"}</div>
          <h1 className="text-[28px] font-black leading-tight sm:text-[32px]">{label}</h1>
          <p className="mt-1 text-[13.5px] font-bold text-fg-3">
            Edited {timeAgo(review.updated_at)} by {people.get(review.updated_by)?.full_name ?? "someone"}
          </p>
          {view === "guided" ? (
            <Guided review={review} fields={fields} onFinish={() => setMode("all")} />
          ) : (
            <div className="mt-7 space-y-4">
              {fields.map((field) => (
                <Card key={field.key} className="px-5 pb-4 pt-4">
                  <h2 className="text-[17px] font-extrabold">{field.label}</h2>
                  <ReviewAnswer review={review} field={field} className="mt-1 min-h-[28px] text-[16px] font-semibold leading-relaxed" />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function Guided({ review, fields, onFinish }: { review: Review; fields: ReviewField[]; onFinish: () => void }) {
  const toast = useToast();
  const firstOpen = Math.max(0, fields.findIndex((f) => !review[f.key]?.trim()));
  const [step, setStep] = useState(firstOpen);
  const field = fields[step]!;
  const answered = answeredCount(review);
  const last = step === fields.length - 1;
  const next = () => {
    if (last) {
      toast.show({ title: "Review done! 🎉", description: "Nice — next month you’ll thank yourself.", tone: "success" });
      onFinish();
    } else setStep((s) => s + 1);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <ProgressBar value={answered / fields.length} tone="green" size="lg" />
        <span className="shrink-0 text-[14px] font-extrabold text-fg-2 tabular">
          {answered}/{fields.length}
        </span>
      </div>

      <div key={field.key} className="anim-pop mt-8">
        <div className="mb-5 flex items-center gap-2">
          <Mascot mood="think" size={84} />
          <SpeechBubble className="ml-2 flex-1">
            <span className="label-caps block text-[11px] text-purple-edge">
              Question {step + 1} of {fields.length} · {field.label}
            </span>
            <span className="mt-0.5 block text-[17px] font-extrabold">{field.hint}</span>
          </SpeechBubble>
        </div>
        <ReviewAnswer
          review={review}
          field={field}
          autoFocus
          placeholder="Type your answer… a few bullet points is plenty."
          className="min-h-[180px] rounded-2xl border-2 border-line bg-subtle px-5 py-4 text-[16px] font-semibold leading-relaxed focus:border-blue"
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-line pt-6">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" size="md" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {!last && (
            <Button variant="secondary" size="md" onClick={() => setStep((s) => s + 1)}>
              Skip
            </Button>
          )}
        </div>
        <Button variant="primary" size="lg" className="min-w-40" onClick={next}>
          {last ? "Finish" : "Continue"}
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5" aria-label="Questions">
        {fields.map((f, i) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStep(i)}
            title={f.label}
            aria-label={`Question ${i + 1}: ${f.label}`}
            className={cn(
              "size-3 rounded-full transition-transform hover:scale-125",
              i === step ? "bg-blue ring-4 ring-blue/25" : review[f.key]?.trim() ? "bg-green" : "bg-active",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Autosaving answer box; takes remote edits while you're not typing in it. */
function ReviewAnswer({
  review,
  field,
  className,
  placeholder,
  autoFocus,
}: {
  review: Review;
  field: ReviewField;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { update, me } = useWorkspace();
  const [value, setValue] = useState(review[field.key] ?? "");
  const [focused, setFocused] = useState(false);
  const { schedule, flush } = useDebouncedSave<string>((v) => void update("reviews", review.id, { [field.key]: v, updated_by: me?.id ?? null }), 600);

  const remote = review[field.key] ?? "";
  const [seen, setSeen] = useState(remote);
  if (!focused && remote !== seen) {
    setSeen(remote);
    setValue(remote);
  }

  return (
    <AutoTextarea
      value={value}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        flush();
      }}
      onChange={(e) => {
        setValue(e.target.value);
        schedule(e.target.value);
      }}
      placeholder={placeholder ?? field.hint}
      className={className}
    />
  );
}

/** Rail: the period's numbers as statistic tiles. */
function NumbersCard({ review }: { review: Review }) {
  const { data } = useWorkspace();
  const fin = useFinance();
  const [start, end] = periodRange(review.period, review.period_start);
  const m = periodMetrics(data, start, end);
  const list = review.period === "month" ? fin.summary?.months : fin.summary?.quarters;
  const f = list?.find((x) => x.key === financeKey(review.period, review.period_start));
  return (
    <RailCard title="The numbers" action={<RevealToggle />}>
      <StatRow
        columns={2}
        className="pt-1"
        stats={[
          { icon: "🚀", label: "Projects started", value: m.projectsStarted },
          { icon: "🏁", label: "Projects done", value: m.projectsCompleted },
          { icon: "✅", label: "Tasks done", value: m.tasksCompleted },
          { icon: "⏰", label: "Went late", value: m.overdueTasks, tone: m.overdueTasks ? "danger" : "default" },
          { icon: "💰", label: "Revenue", value: <Money value={f?.income ?? null} currency={fin.currency} compact /> },
          { icon: "🧾", label: "Expenses", value: <Money value={f?.expenses ?? null} currency={fin.currency} compact /> },
        ]}
      />
    </RailCard>
  );
}
