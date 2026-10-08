"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, House, User } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, isAssignedTo, isDueToday, isOverdue } from "@/lib/selectors";
import { firstName, formatLongDate, greeting, plural, todayISO } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { LayoutSwitcher } from "./home-blocks";
import { HOME_LAYOUTS, isHomeLayout, useSavedLayout, type HomeLayout } from "./home-data";
import { PersonalView } from "./personal-view";
import { StudioView } from "./studio-view";

type View = "personal" | "studio";

export function HomeView() {
  const { data, me } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("view");
  const view: View = requested === "studio" ? "studio" : "personal";

  // Layout: ?layout= wins (shareable), otherwise the last one picked on this device.
  const [savedLayout, saveLayout] = useSavedLayout();
  const requestedLayout = params.get("layout");
  const layout: HomeLayout = isHomeLayout(requestedLayout) ? requestedLayout : savedLayout;

  const navigate = (nextView: View, nextLayout: HomeLayout) => {
    const q = new URLSearchParams();
    if (nextView !== "personal") q.set("view", nextView);
    if (nextLayout !== "table") q.set("layout", nextLayout);
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const changeLayout = (l: HomeLayout) => {
    saveLayout(l);
    navigate(view, l);
  };

  // Finance and Performance moved to Library — keep old links working.
  useEffect(() => {
    if (requested === "finance" || requested === "performance") router.replace(`/library?tab=${requested}`);
  }, [requested, router]);
  const today = todayISO();

  // The 10-second summary: one sentence that says how things stand.
  const summary = useMemo(() => {
    const mine = data.tasks.filter((t) => isAssignedTo(t, me?.id ?? null));
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
      <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-1.5">
        <ViewTabs<View>
          className="shrink-0 grow"
          value={view}
          onChange={(v) => navigate(v, layout)}
          items={[
            { value: "personal", label: "Personal", icon: <User className="size-4" /> },
            { value: "studio", label: "Studio", icon: <Building2 className="size-4" /> },
          ]}
        />
        <LayoutSwitcher value={layout} onChange={changeLayout} layouts={HOME_LAYOUTS} />
      </div>
      {view === "personal" && <PersonalView layout={layout} />}
      {view === "studio" && <StudioView layout={layout} />}
    </Page>
  );
}
