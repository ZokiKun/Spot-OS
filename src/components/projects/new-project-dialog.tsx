"use client";

import { useState } from "react";
import { Flag, Plus, X } from "lucide-react";
import { todayISO } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ProjectType } from "@/lib/types";
import { PROJECT_TYPES } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { DateField, OptionField, PersonField } from "@/components/ui/fields";

type DraftMilestone = { key: number; title: string; due: string | null };
const PLACEHOLDERS = ["Discovery", "Design", "Delivery"];
const blankMilestones = (): DraftMilestone[] => PLACEHOLDERS.map((_, key) => ({ key, title: "", due: null }));

const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶"];

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create, me } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [type, setType] = useState<ProjectType>("client");
  const [client, setClient] = useState("");
  const [lead, setLead] = useState<string | null>(me?.id ?? null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<DraftMilestone[]>(blankMilestones);

  const reset = () => {
    setName("");
    setClient("");
    setDeadline(null);
    setMilestones(blankMilestones());
    setIcon("📁");
  };

  const submit = async () => {
    if (!name.trim()) return;
    const p = await create("projects", {
      name: name.trim(),
      icon,
      type,
      status: "active",
      client: client.trim() || null,
      client_contact: null,
      creative_director_id: null,
      lead_id: lead,
      start_date: todayISO(),
      deadline,
      description: null,
      next_action: null,
      note: null,
      tags: [],
      cover: null,
      cover_position: 50,
      notes_html: null,
      created_by: me?.id ?? null,
      completed_at: null,
    });
    // Timeline: named rows become milestones, in the order they were listed.
    const steps = milestones.filter((m) => m.title.trim());
    for (const [sort_order, m] of steps.entries())
      await create("milestones", { project_id: p.id, title: m.title.trim(), due_date: m.due, sort_order, created_by: me?.id ?? null });
    reset();
    onClose();
    router.push(`/projects/${p.id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!name.trim()}>
            Create project
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <div>
          <div className="mb-1.5 flex flex-wrap gap-0.5">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`flex size-8 items-center justify-center rounded-md text-[17px] hover:bg-hover ${icon === i ? "bg-active" : ""}`}
              >
                {i}
              </button>
            ))}
          </div>
          <TextInput autoFocus placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-[16px]" />
        </div>
        <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-1 text-[14px]">
          <span className="text-fg-2">Type</span>
          <div className="-ml-1.5">
            <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={type} onChange={setType} />
          </div>
          <span className="text-fg-2">Client</span>
          <TextInput placeholder="Optional" value={client} onChange={(e) => setClient(e.target.value)} />
          <span className="text-fg-2">Lead</span>
          <div className="-ml-1.5">
            <PersonField variant="property" people={people.list} value={lead} onChange={setLead} />
          </div>
          <span className="text-fg-2">Deadline</span>
          <div className="-ml-1.5">
            <DateField variant="property" value={deadline} onChange={setDeadline} />
          </div>
        </div>
        <TimelineDraft milestones={milestones} onChange={setMilestones} />
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/** Major milestones, in order. Tasks get added under them on the project's Timeline tab. */
function TimelineDraft({ milestones, onChange }: { milestones: DraftMilestone[]; onChange: (m: DraftMilestone[]) => void }) {
  const patch = (key: number, p: Partial<DraftMilestone>) => onChange(milestones.map((m) => (m.key === key ? { ...m, ...p } : m)));
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2 text-[14px]">
        <span className="text-fg-2">Timeline</span>
        <span className="text-[12px] text-fg-3">Major milestones, in order. The first unfinished one is the project’s next step.</span>
      </div>
      <ol className="space-y-1">
        {milestones.map((m, i) => (
          <li key={m.key} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right text-[12px] text-fg-3 tabular">{i + 1}</span>
            <TextInput
              placeholder={PLACEHOLDERS[i] ? `e.g. ${PLACEHOLDERS[i]}` : "Milestone"}
              value={m.title}
              onChange={(e) => patch(m.key, { title: e.target.value })}
              aria-label={`Milestone ${i + 1}`}
              className="min-w-0 flex-1"
            />
            <div className="w-28 shrink-0 text-[13px]">
              <DateField variant="property" value={m.due} placeholder="Due date" onChange={(due) => patch(m.key, { due })} />
            </div>
            <IconButton label={`Remove milestone ${i + 1}`} onClick={() => onChange(milestones.filter((x) => x.key !== m.key))}>
              <X className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...milestones, { key: Math.max(-1, ...milestones.map((m) => m.key)) + 1, title: "", due: null }])}
        className="mt-1 flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-fg-3 hover:bg-hover hover:text-fg-2"
      >
        <Plus className="size-3.5" /> Add milestone
      </button>
      {milestones.every((m) => !m.title.trim()) && (
        <p className="mt-1 flex items-center gap-1.5 px-2 text-[12px] text-fg-3">
          <Flag className="size-3" /> You can also plan the timeline later from the project page.
        </p>
      )}
    </div>
  );
}
