"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Building2, House, User, Wallet } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, isDueToday, isOverdue } from "@/lib/selectors";
import { firstName, formatLongDate, greeting, plural, todayISO } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { PersonalView } from "./personal-view";
import { StudioView } from "./studio-view";
import { FinanceView } from "./finance-view";
import { PerformanceView } from "./performance-view";

type View = "personal" | "studio" | "finance" | "performance";

export function HomeView() {
  const { data, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (params.get("view") as View) || "personal";
  const today = todayISO();

  // The 10-second summary: one sentence that says how things stand.
  const summary = useMemo(() => {
    const mine = data.tasks.filter((t) => t.assignee_id === me?.id);
    const overdue = mine.filter((t) => isOverdue(t, today)).length;
    const dueToday = mine.filter((t) => isDueToday(t, today)).length;
    const active = data.projects.filter(isActiveProject).length;
    const blocked = data.projects.filter((p) => p.status === "blocked").length;
    const parts: string[] = [];
    if (overdue) parts.push(`${plural(overdue, "overdue task")}`);
    if (dueToday) parts.push(`${dueToday} due today`);
    const you = parts.length ? `You have ${parts.join(" and ")}.` : "You’re on top of your tasks.";
    const studio = `The studio has ${plural(active, "active project")}${blocked ? `, ${blocked} blocked` : ""}.`;
    return `${you} ${studio}`;
  }, [data.tasks, data.projects, me, today]);

  return (
    <Page crumbs={[{ label: "Home", icon: <House className="size-4" /> }]}>
      <div className="mb-7">
        <div className="text-[13px] text-fg-2">{formatLongDate(today)}</div>
        <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.01em] sm:text-[36px]">
          {greeting()}, {firstName(me?.full_name) || "there"}
        </h1>
        <p className="mt-1.5 text-[15px] text-fg-2">{summary}</p>
      </div>
      <div className="mb-7 border-b border-line pb-1.5">
        <ViewTabs<View>
          value={view}
          onChange={(v) => router.replace(v === "personal" ? pathname : `${pathname}?view=${v}`, { scroll: false })}
          items={[
            { value: "personal", label: "Personal", icon: <User className="size-4" /> },
            { value: "studio", label: "Studio", icon: <Building2 className="size-4" /> },
            { value: "finance", label: "Finance", icon: <Wallet className="size-4" /> },
            { value: "performance", label: "Performance", icon: <BarChart3 className="size-4" /> },
          ]}
        />
      </div>
      {view === "personal" && <PersonalView />}
      {view === "studio" && <StudioView />}
      {view === "finance" && <FinanceView />}
      {view === "performance" && <PerformanceView />}
    </Page>
  );
}
