"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, FileSpreadsheet, House, Pin, User } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { useFinance } from "@/lib/finance/use-finance";
import { isActiveProject, isAssignedTo, isDueToday, isOverdue } from "@/lib/selectors";
import { cn, firstName, formatLongDate, greeting, plural, timeAgo, todayISO } from "@/lib/utils";
import { usePref } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Page } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { LayoutSwitcher } from "./home-blocks";
import { HOME_LAYOUTS, isHomeLayout, useSavedLayout, type HomeLayout } from "./home-data";
import { PersonalView } from "./personal-view";
import { StudioView } from "./studio-view";
import { QuickAddFab } from "@/components/shell/quick-add";

type View = "personal" | "studio";

export function HomeView() {
  const { data, me } = useWorkspace();
  const fin = useFinance();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const requested = params.get("view");

  // Each person can pin their favourite view (tab + layout): Home then always opens on it.
  const [pinned, setPinned] = usePref<{ view: View; layout: HomeLayout } | null>(`home-pin:${me?.id ?? "anon"}`, null);
  const pin = pinned && isHomeLayout(pinned.layout) ? pinned : null;

  // Without a pin, the layout is the last one picked on this device. ?view= / ?layout= win (shareable).
  const [savedLayout, saveLayout] = useSavedLayout();
  const defaultView: View = pin?.view ?? "personal";
  const defaultLayout: HomeLayout = pin?.layout ?? savedLayout;
  const view: View = requested === "studio" || requested === "personal" ? requested : defaultView;
  const requestedLayout = params.get("layout");
  const layout: HomeLayout = isHomeLayout(requestedLayout) ? requestedLayout : defaultLayout;
  const isPinned = !!pin && pin.view === view && pin.layout === layout;

  const navigate = (nextView: View, nextLayout: HomeLayout) => {
    const q = new URLSearchParams();
    if (nextView !== defaultView) q.set("view", nextView);
    if (nextLayout !== defaultLayout) q.set("layout", nextLayout);
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const changeLayout = (l: HomeLayout) => {
    if (!pin) saveLayout(l);
    navigate(view, l);
  };
  const togglePin = () => {
    if (isPinned) {
      setPinned(undefined);
      saveLayout(layout);
      toast.show({ title: "Unpinned", description: "Home opens on the last layout you picked." });
    } else {
      setPinned({ view, layout });
      router.replace(pathname, { scroll: false });
      toast.show({ title: "Pinned as your Home", description: `${view === "studio" ? "Studio" : "Personal"} · ${layout[0]!.toUpperCase()}${layout.slice(1)} — only for you.`, tone: "success" });
    }
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
        {fin.stale && (
          <Link href="/settings?section=finance" className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg">
            <FileSpreadsheet className="size-3.5" />
            Finance was last updated {timeAgo(fin.updatedAt)}. <span className="font-medium text-accent">Upload this month’s file</span>
          </Link>
        )}
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
        <button
          type="button"
          onClick={togglePin}
          aria-pressed={isPinned}
          title={isPinned ? "This is your pinned Home — click to unpin" : "Pin this view: Home will always open on it (just for you)"}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] transition-colors",
            isPinned ? "bg-accent-soft font-medium text-accent" : "text-fg-2 hover:bg-hover hover:text-fg",
          )}
        >
          <Pin className={cn("size-4", isPinned && "fill-current")} />
          <span className="hidden sm:inline">{isPinned ? "Pinned" : pin ? "Pin instead" : "Pin view"}</span>
        </button>
      </div>
      {view === "personal" && <PersonalView layout={layout} />}
      {view === "studio" && <StudioView layout={layout} />}
      <QuickAddFab />
    </Page>
  );
}
