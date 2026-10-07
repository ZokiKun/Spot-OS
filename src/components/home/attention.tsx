"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { AttentionItem, AttentionKind } from "@/lib/selectors";
import { attentionItems } from "@/lib/selectors";
import { useProfiles, useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { Avatar } from "@/components/ui/avatar";
import { Card, MUTED, PillTabs, SOFT, type Tone } from "@/components/ui/chunk";
import { useTaskPeek } from "@/components/tasks/task-peek";

const KIND: Record<AttentionKind, string> = {
  overdue_task: "Late",
  project_overdue: "Past its deadline",
  blocked_project: "Stuck",
  blocked_task: "Stuck",
  due_today: "Due today",
  no_next_action: "No next step",
  deadline_soon: "Deadline soon",
};

/** Everything that needs a look, split into "now" and "soon" — never one long list. */
export function AttentionView() {
  const { data, me } = useWorkspace();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const items = useMemo(() => attentionItems(data, { meId: me?.id ?? null, mine: scope === "mine" }), [data, me, scope]);
  const now = items.filter((i) => i.severity === "high");
  const soon = items.filter((i) => i.severity !== "high");

  return (
    <Page crumbs={[{ label: "Home", href: "/" }, { label: "Heads up" }]} width="doc">
      <PageTitle title={<>Heads<br />up</>} description="Things that would otherwise be noticed too late. Clear the orange ones first." />
      <PillTabs
        className="mb-6"
        value={scope}
        onChange={setScope}
        items={[
          { value: "mine", label: "Mine", count: attentionItems(data, { meId: me?.id ?? null, mine: true }).length },
          { value: "all", label: "Whole studio", count: attentionItems(data, { meId: null, mine: false }).length },
        ]}
      />
      {items.length === 0 ? (
        <Card tone="lime" className="items-center py-14 text-center">
          <Sparkles className="size-8" />
          <div className="mt-3 text-[24px] font-medium tracking-[-0.02em]">All on track</div>
          <div className="mt-1 text-[14px] text-[var(--on-chunk-2)]">Nothing is late, stuck or missing a next step.</div>
        </Card>
      ) : (
        <div className="stagger grid gap-3">
          {now.length > 0 && <Group tone="coral" title="Needs you now" items={now} showAssignee={scope === "all"} />}
          {soon.length > 0 && <Group tone="sun" title="Worth a look" items={soon} showAssignee={scope === "all"} />}
        </div>
      )}
    </Page>
  );
}

function Group({ tone, title, items, showAssignee }: { tone: Tone; title: string; items: AttentionItem[]; showAssignee: boolean }) {
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  return (
    <Card tone={tone} handle className="pt-8">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-[24px] font-medium tracking-[-0.02em]">{title}</span>
        <span className={cn("text-[15px]", MUTED[tone])}>{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const content = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium">{item.title}</span>
                <span className={cn("block truncate text-[12.5px]", MUTED[tone])}>
                  {KIND[item.kind]} · {item.detail}
                </span>
              </span>
              {showAssignee && item.assigneeId !== undefined && <Avatar profile={people.get(item.assigneeId)} size={28} />}
              <ArrowUpRight className="size-4 shrink-0 opacity-50" />
            </>
          );
          const cls = cn("press flex min-h-14 w-full items-center gap-3 rounded-[22px] px-4 py-2 text-left", SOFT[tone]);
          return item.taskId ? (
            <button key={item.id} type="button" className={cls} onClick={() => openTask(item.taskId!)}>
              {content}
            </button>
          ) : (
            <Link key={item.id} href={item.href} className={cls}>
              {content}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
