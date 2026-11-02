"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartColumn, ClipboardCheck, Flag, CalendarRange } from "lucide-react";
import { quarterOfMonth } from "@/lib/studio-review";
import { Page, PageTitle } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { defaultMonth } from "./review-ui";
import { MonthView } from "./month-view";
import { GoalsView } from "./goals-view";
import { OverviewView, type Range } from "./overview-view";

type Tab = "month" | "goals" | "overview";
const isMonth = (v: string) => /^\d{4}-\d{2}-01$/.test(v);

/**
 * Reviews: Month (what each person did, money, Claude's report, commitments), Goals (the quarter on a
 * timeline) and Overview (the studio over a month, quarter or year). Filters live in the URL.
 */
export function ReviewsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "goals" ? "goals" : params.get("tab") === "overview" ? "overview" : "month";
  const fallback = defaultMonth();
  const months = (params.get("months") ?? "").split(",").filter(isMonth);
  const person = params.get("who");
  const quarter = isMonth(params.get("quarter") ?? "") ? params.get("quarter")! : quarterOfMonth(fallback);
  const range: Range = params.get("range") === "quarter" ? "quarter" : params.get("range") === "year" ? "year" : "month";
  const anchor = isMonth(params.get("at") ?? "") ? params.get("at")! : fallback;

  const go = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v == null ? q.delete(k) : q.set(k, v)));
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Page crumbs={[{ label: "Reviews", icon: <ClipboardCheck className="size-4" /> }]}>
      <PageTitle icon="🪞" title="Reviews" description="What each of us did, where the time and money went, and what we said we'd do." />
      <ViewTabs<Tab>
        className="mb-6 border-b border-line pb-1.5"
        value={tab}
        onChange={(t) => go({ tab: t === "month" ? null : t })}
        items={[
          { value: "month", label: "Month", icon: <CalendarRange className="size-4" /> },
          { value: "goals", label: "Goals", icon: <Flag className="size-4" /> },
          { value: "overview", label: "Overview", icon: <ChartColumn className="size-4" /> },
        ]}
      />
      {tab === "month" && (
        <MonthView
          months={months.length ? months : [fallback]}
          person={person}
          onChange={(p) =>
            go({
              ...(p.months ? { months: p.months.length === 1 && p.months[0] === fallback ? null : p.months.join(",") } : {}),
              ...("person" in p ? { who: p.person ?? null } : {}),
            })
          }
        />
      )}
      {tab === "goals" && <GoalsView quarter={quarter} onQuarterChange={(q) => go({ quarter: q === quarterOfMonth(fallback) ? null : q })} />}
      {tab === "overview" && (
        <OverviewView
          range={range}
          anchor={anchor}
          onChange={(p) => go({ ...(p.range ? { range: p.range === "month" ? null : p.range } : {}), ...(p.anchor ? { at: p.anchor === fallback ? null : p.anchor } : {}) })}
        />
      )}
    </Page>
  );
}
