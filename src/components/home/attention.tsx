"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleSlash, Clock, Flag, OctagonX, Sparkles } from "lucide-react";
import type { AttentionItem, AttentionKind } from "@/lib/selectors";
import { useProfiles } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SectionHeading } from "@/components/ui/misc";
import { useTaskPeek } from "@/components/tasks/task-peek";

const KIND: Record<AttentionKind, { label: string; icon: typeof Clock; tone: string }> = {
  overdue_task: { label: "Overdue", icon: Clock, tone: "text-danger" },
  project_overdue: { label: "Past deadline", icon: Flag, tone: "text-danger" },
  blocked_project: { label: "Blocked", icon: OctagonX, tone: "text-danger" },
  blocked_task: { label: "Blocked", icon: CircleSlash, tone: "text-[var(--dot-orange)]" },
  due_today: { label: "Due today", icon: CircleAlert, tone: "text-[var(--dot-orange)]" },
  no_next_action: { label: "No next action", icon: ArrowRight, tone: "text-[var(--dot-yellow)]" },
  deadline_soon: { label: "Deadline soon", icon: Flag, tone: "text-[var(--dot-orange)]" },
};

export function Attention({ items, showAssignee = false, initial = 6 }: { items: AttentionItem[]; showAssignee?: boolean; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const shown = expanded ? items : items.slice(0, initial);

  return (
    <section>
      <SectionHeading icon={<CircleAlert className="size-3.5" />}>Needs attention</SectionHeading>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-callout px-3 py-2.5 text-[14px] text-fg-2">
          <Sparkles className="size-4 text-[var(--dot-green)]" /> Nothing needs attention. Everything is on track.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--border)]">
          {shown.map((item, i) => {
            const k = KIND[item.kind];
            const Icon = k.icon;
            const content = (
              <>
                <Icon className={cn("size-4 shrink-0", k.tone)} strokeWidth={2} />
                <span className={cn("w-[104px] shrink-0 text-[12px] font-medium max-sm:hidden", k.tone)}>{k.label}</span>
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-fg-3"> · {item.detail}</span>
                </span>
                {showAssignee && item.assigneeId !== undefined && <Avatar profile={people.get(item.assigneeId)} size={18} />}
              </>
            );
            const cls = cn("flex h-10 w-full items-center gap-3 bg-bg px-3 text-left transition-colors hover:bg-hover", i > 0 && "border-t border-line");
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
          {items.length > initial && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex h-8 w-full items-center border-t border-line bg-bg px-3 text-[13px] text-fg-2 hover:bg-hover"
            >
              {expanded ? "Show less" : `Show ${items.length - initial} more`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
