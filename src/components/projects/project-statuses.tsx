"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { CustomTaskStatus, Project, TaskStatus } from "@/lib/types";
import type { TagColor } from "@/lib/constants";
import { TASK_STATUSES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { defaultCustomStatuses } from "@/lib/task-statuses";
import { cn, uid } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/ui/button";
import { StatusTag } from "@/components/ui/tag";
import { Popover, usePopover } from "@/components/ui/popover";

const COLORS: TagColor[] = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

/**
 * Edit a project's own task statuses, e.g. Sketch → Inking → Colouring → Done for a comic.
 * Each one "counts as" a built-in status, which keeps done, overdue and progress working.
 */
export function TaskStatusesDialog({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const { data, update } = useWorkspace();
  const [rows, setRows] = useState<CustomTaskStatus[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRows(project.task_statuses?.length ? project.task_statuses : defaultCustomStatuses());
  }

  const patch = (i: number, p: Partial<CustomTaskStatus>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const next = r.slice();
      const [x] = next.splice(i, 1);
      next.splice(i + d, 0, x!);
      return next;
    });
  const cleaned = rows.map((r) => ({ ...r, label: r.label.trim() })).filter((r) => r.label);
  const hasDone = cleaned.some((r) => r.base === "done");
  const hasOpen = cleaned.some((r) => r.base !== "done");
  const inUse = (id: string) => data.tasks.filter((t) => t.project_id === project.id && t.custom_status === id).length;

  const save = () => {
    void update("projects", project.id, { task_statuses: cleaned });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Task statuses · ${project.name}`}
      width={560}
      footer={
        <>
          {project.task_statuses?.length ? (
            <Button
              className="mr-auto"
              variant="ghost"
              onClick={() => {
                void update("projects", project.id, { task_statuses: null });
                onClose();
              }}
            >
              Use the standard statuses
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!hasDone || !hasOpen} onClick={save}>
            Save statuses
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-fg-2">
        Name the steps tasks in this project move through. “Counts as” tells Spot OS what each one means — anything that counts as Done is finished and
        ticks the checkbox.
      </p>
      <div className="space-y-1">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_130px_56px_28px] items-center gap-2 px-1 text-[12px] text-fg-3">
          <span />
          <span>Status</span>
          <span>Counts as</span>
          <span />
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[28px_minmax(0,1fr)_130px_56px_28px] items-center gap-2 rounded-md px-1 py-0.5 hover:bg-hover">
            <ColorPicker value={r.color as TagColor} onChange={(color) => patch(i, { color })} />
            <input
              value={r.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="Status name"
              className="h-8 min-w-0 rounded-md bg-input px-2 text-[14px] outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--accent)]"
            />
            <select
              value={r.base}
              onChange={(e) => patch(i, { base: e.target.value as TaskStatus })}
              className="h-8 rounded-md bg-input px-1.5 text-[13px] shadow-[inset_0_0_0_1px_var(--border)]"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="flex">
              <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </IconButton>
              <IconButton label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </IconButton>
            </span>
            <IconButton
              label={inUse(r.id) ? `Remove — its ${inUse(r.id)} task(s) move to another status that counts as the same` : "Remove"}
              onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((r) => [...r, { id: `s_${uid().slice(0, 8)}`, label: "", color: "blue", base: "in_progress" }])}
        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[14px] font-medium text-accent hover:bg-accent-soft"
      >
        <Plus className="size-4" /> Add status
      </button>
      {(!hasDone || !hasOpen) && (
        <p className="mt-2 text-[13px] text-danger">Keep at least one status that counts as Done and one that doesn’t.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
        <span className="mr-1 text-[12px] text-fg-3">Preview</span>
        {cleaned.map((r) => (
          <StatusTag key={r.id} color={r.color as TagColor}>
            {r.label}
          </StatusTag>
        ))}
      </div>
    </Dialog>
  );
}

function ColorPicker({ value, onChange }: { value: TagColor; onChange: (c: TagColor) => void }) {
  const { setAnchor, ...pop } = usePopover();
  return (
    <>
      <button ref={setAnchor} type="button" onClick={pop.toggle} aria-label="Colour" className="flex size-7 items-center justify-center rounded-md hover:bg-active">
        <span className={cn(`dot-${value}`, "size-3 rounded-full")} />
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={196}>
        <div className="grid grid-cols-5 gap-1 p-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => {
                onChange(c);
                pop.close();
              }}
              className={cn("flex size-8 items-center justify-center rounded-md hover:bg-hover", c === value && "bg-active")}
            >
              <span className={cn(`dot-${c}`, "size-3.5 rounded-full")} />
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
