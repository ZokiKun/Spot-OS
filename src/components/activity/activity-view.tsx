"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { ActivityEntry } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { firstName } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { ViewTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { ProjectField } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/misc";
import { ActivityFeed } from "@/components/activity-feed";

/** What a filter chip covers. */
const KINDS = {
  all: { label: "Everything", types: null },
  tasks: { label: "Tasks", types: ["task", "milestone"] },
  projects: { label: "Projects", types: ["project"] },
  invoices: { label: "Invoices", types: ["invoice"] },
  files: { label: "Files & links", types: ["attachment", "library_item"] },
  notes: { label: "Notes & docs", types: ["calendar_note", "kb_page", "review"] },
  deleted: { label: "Deleted", types: null },
} as const satisfies Record<string, { label: string; types: readonly ActivityEntry["entity_type"][] | null }>;
type Kind = keyof typeof KINDS;

const PAGE = 100;

/** Everything happening in Spot OS, newest first, grouped by day — filter by kind, person and project. */
export function ActivityView() {
  const { data } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const kind = (params.get("kind") as Kind) in KINDS ? (params.get("kind") as Kind) : "all";
  const person = params.get("person");
  const projectId = params.get("project");
  const [shown, setShown] = useState(PAGE);

  const setParam = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    setShown(PAGE);
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const entries = useMemo(() => {
    const types = KINDS[kind].types as readonly string[] | null;
    return data.activity_log
      .filter((e) => (kind === "deleted" ? e.action === "deleted" : !types || types.includes(e.entity_type)))
      .filter((e) => !person || e.actor_id === person)
      .filter((e) => !projectId || e.project_id === projectId || (e.meta as { project_id?: string }).project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data.activity_log, kind, person, projectId]);

  // Day groups: Today, Yesterday, then dates.
  const days = useMemo(() => {
    const groups: { label: string; entries: ActivityEntry[] }[] = [];
    for (const e of entries.slice(0, shown)) {
      const d = new Date(e.created_at);
      const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, d MMMM");
      const last = groups.at(-1);
      if (last?.label === label) last.entries.push(e);
      else groups.push({ label, entries: [e] });
    }
    return groups;
  }, [entries, shown]);

  return (
    <Page crumbs={[{ label: "Activity", icon: <Activity className="size-4" /> }]}>
      <PageTitle title="Activity" description="Everything happening in Spot OS — tasks, projects, invoices, files, notes and who did it." />
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-line pb-1.5">
        <ViewTabs<Kind>
          className="min-w-0 grow"
          value={kind}
          onChange={(k) => setParam("kind", k === "all" ? null : k)}
          items={(Object.keys(KINDS) as Kind[]).map((k) => ({ value: k, label: KINDS[k].label }))}
        />
        <div className="w-56 shrink-0">
          <ProjectField projects={data.projects} value={projectId} onChange={(v) => setParam("project", v)} placeholder="All projects" />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setParam("person", null)}
          className={!person ? "h-7 rounded-full bg-active px-2.5 text-[13px] font-medium" : "h-7 rounded-full px-2.5 text-[13px] text-fg-2 hover:bg-hover"}
        >
          Everyone
        </button>
        {people.list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setParam("person", person === p.id ? null : p.id)}
            className={
              person === p.id
                ? "flex h-7 items-center gap-1.5 rounded-full bg-active px-2.5 text-[13px] font-medium"
                : "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-fg-2 hover:bg-hover"
            }
          >
            <Avatar profile={p} size={16} /> {firstName(p.full_name)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Try another filter — or check back once the team has been busy." />
      ) : (
        <div className="space-y-6">
          {days.map((d) => (
            <section key={d.label}>
              <div className="mb-1 px-2 text-[12px] font-medium text-fg-2">{d.label}</div>
              <ActivityFeed entries={d.entries} limit={d.entries.length} />
            </section>
          ))}
          {entries.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-8 rounded-md px-3 text-[14px] text-fg-2 hover:bg-hover">
              Show older ({entries.length - shown} more)
            </button>
          )}
        </div>
      )}
    </Page>
  );
}
