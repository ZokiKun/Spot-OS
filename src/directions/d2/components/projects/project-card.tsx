"use client";

import type { Project } from "@/directions/d2/lib/types";
import { PROJECT_STATUSES, PROJECT_STATUS_TONE, optionFor } from "@/directions/d2/lib/constants";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { projectProgress } from "@/directions/d2/lib/selectors";
import { cn, daysUntil, relativeDays } from "@/directions/d2/lib/utils";
import { Avatar } from "@/directions/d2/components/ui/avatar";
import { Card, Chip, MUTED, Ring, SOFT } from "@/directions/d2/components/ui/chunk";

/** One project as one chunk: what it is, where it stands, the one next step. */
export function ProjectCard({ project: p, className, compact = false }: { project: Project; className?: string; compact?: boolean }) {
  const { data } = useWorkspace();
  const people = useProfiles();
  const tone = PROJECT_STATUS_TONE[p.status];
  const status = optionFor(PROJECT_STATUSES, p.status)!;
  const prog = projectProgress(p.id, data.tasks);
  const lead = people.get(p.lead_id);
  const diff = daysUntil(p.deadline);
  const open = !["completed", "archived"].includes(p.status);
  const late = open && diff != null && diff < 0;

  return (
    <Card tone={tone} href={`/projects/${p.id}`} className={cn(compact ? "min-h-[200px]" : "min-h-[236px]", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-[22px] leading-none", SOFT[tone])}>{p.icon ?? "📁"}</span>
        <Chip tone={tone}>{status.label}</Chip>
      </div>
      <div className="mt-4 line-clamp-2 text-[20px] font-medium leading-[1.15] tracking-[-0.02em]">{p.name}</div>
      {p.client && <div className={cn("mt-1 truncate text-[13px]", MUTED[tone])}>{p.client}</div>}
      {!compact && (
        <div className={cn("mt-3 rounded-[18px] px-3.5 py-2.5", SOFT[tone])}>
          <div className={cn("text-[11.5px]", MUTED[tone])}>Next step</div>
          <div className={cn("line-clamp-2 text-[13.5px] leading-snug", !p.next_action && "opacity-60")}>
            {p.next_action ?? (open ? "Not set yet — open to add one" : "—")}
          </div>
        </div>
      )}
      <div className="mt-auto flex items-center gap-2 pt-4">
        {lead && <Avatar profile={lead} size={28} />}
        {p.deadline && open && (
          <Chip tone={tone} className={cn(late && "bg-[#151515]! text-[#f7f3ea]")}>
            {relativeDays(p.deadline)}
          </Chip>
        )}
        {prog.total > 0 && (
          <span className="ml-auto flex items-center gap-2 text-[12px] tabular">
            <span className={MUTED[tone]}>
              {prog.done}/{prog.total}
            </span>
            <Ring value={prog.ratio} size={30} />
          </span>
        )}
      </div>
    </Card>
  );
}
