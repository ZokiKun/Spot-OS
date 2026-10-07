"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AttentionItem, AttentionKind } from "@/lib/selectors";
import { useProfiles } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Card, IconTile, type Tone } from "@/components/ui/misc";
import { Mascot } from "@/components/ui/mascot";
import { useTaskPeek } from "@/components/tasks/task-peek";

/** Each kind of problem, said the way you'd say it to a teammate. */
const KIND: Record<AttentionKind, { say: string; emoji: string; tone: Tone }> = {
  overdue_task: { say: "This task is late", emoji: "⏰", tone: "red" },
  project_overdue: { say: "Past its deadline", emoji: "⏰", tone: "red" },
  blocked_project: { say: "Stuck — needs a hand", emoji: "🚧", tone: "red" },
  blocked_task: { say: "This task is stuck", emoji: "🚧", tone: "orange" },
  due_today: { say: "Due today", emoji: "📌", tone: "orange" },
  no_next_action: { say: "Needs a next step", emoji: "🧭", tone: "yellow" },
  deadline_soon: { say: "Deadline coming up", emoji: "📅", tone: "orange" },
};

/** "Needs a nudge" — a short list of things that would otherwise be noticed too late. */
export function Attention({ items, showAssignee = false, initial = 3 }: { items: AttentionItem[]; showAssignee?: boolean; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  const people = useProfiles();
  const { openTask } = useTaskPeek();
  const shown = expanded ? items : items.slice(0, initial);

  if (items.length === 0)
    return (
      <Card className="flex items-center gap-4 px-5 py-4">
        <Mascot mood="cheer" size={56} />
        <div>
          <div className="text-[16px] font-extrabold">Nothing needs a nudge</div>
          <div className="text-[14px] font-semibold text-fg-2">Every project has a next step and nothing is stuck.</div>
        </div>
      </Card>
    );

  return (
    <Card className="overflow-hidden">
      <div className="divide-y-2 divide-line">
        {shown.map((item) => {
          const k = KIND[item.kind];
          const content = (
            <>
              <IconTile tone={k.tone} size={44}>
                {k.emoji}
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-extrabold">{item.title}</span>
                <span className={cn("block truncate text-[13.5px] font-bold", k.tone === "red" ? "text-red" : k.tone === "yellow" ? "text-yellow-edge" : "text-orange")}>
                  {k.say}
                </span>
              </span>
              {showAssignee && item.assigneeId !== undefined && <Avatar profile={people.get(item.assigneeId)} size={28} />}
              <ChevronRight className="size-5 shrink-0 text-fg-3" strokeWidth={3} />
            </>
          );
          const cls = "flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-subtle";
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
      {items.length > initial && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="label-caps flex h-12 w-full items-center justify-center border-t-2 border-line text-[13px] text-blue hover:bg-subtle"
        >
          {expanded ? "Show less" : `Show ${items.length - initial} more`}
        </button>
      )}
    </Card>
  );
}
