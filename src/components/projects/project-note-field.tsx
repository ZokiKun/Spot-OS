"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { Popover, usePopover } from "@/components/ui/popover";
import { AutoTextarea } from "@/components/ui/input";

/** Table cell: a short running note per project. Click to edit; saves when the popover closes. */
export function ProjectNoteField({ project }: { project: Project }) {
  const { update } = useWorkspace();
  const { setAnchor: anchorRef, ...pop } = usePopover();
  const [draft, setDraft] = useState(project.note ?? "");

  const open = () => {
    setDraft(project.note ?? "");
    pop.toggle();
  };
  const save = () => {
    const next = draft.trim() || null;
    if (next !== (project.note ?? null)) void update("projects", project.id, { note: next });
    pop.close();
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={open}
        title={project.note ?? undefined}
        className="flex h-full min-h-8 w-full min-w-0 items-center px-2 text-left transition-colors duration-75 hover:bg-hover"
      >
        {project.note ? <span className="truncate text-[13px] text-fg-2">{project.note}</span> : <span className="text-[13px] text-fg-3 opacity-0 group-hover:opacity-100">Add a note…</span>}
      </button>
      <Popover open={pop.open} onClose={save} anchor={pop.anchor} width={340}>
        <div className="p-2">
          <AutoTextarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            placeholder="A quick note about this project…"
            className="min-h-[72px] text-[14px] leading-relaxed"
          />
          <div className="mt-1 text-[11px] text-fg-3">⌘↵ or click outside to save</div>
        </div>
      </Popover>
    </>
  );
}
