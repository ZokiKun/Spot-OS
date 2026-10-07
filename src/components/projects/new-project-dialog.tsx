"use client";

import { useState } from "react";
import { todayISO } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ProjectType } from "@/lib/types";
import { PROJECT_TYPES } from "@/lib/constants";
import { useProfiles, useWorkspace } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { DateField, OptionField, PersonField, PropertyRow } from "@/components/ui/fields";
import { cn } from "@/lib/utils";

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
  const [nextAction, setNextAction] = useState("");

  const reset = () => {
    setName("");
    setClient("");
    setDeadline(null);
    setNextAction("");
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
      next_action: nextAction.trim() || null,
      notes_html: null,
      created_by: me?.id ?? null,
      completed_at: null,
    });
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
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={() => void submit()} disabled={!name.trim()}>
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
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-pressed={icon === i}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border-2 text-[19px]",
                  icon === i ? "border-line-selected bg-selected" : "border-transparent hover:bg-hover",
                )}
              >
                {i}
              </button>
            ))}
          </div>
          <TextInput autoFocus placeholder="What’s the project called?" value={name} onChange={(e) => setName(e.target.value)} className="text-[17px] font-extrabold" />
        </div>
        <TextInput placeholder="What’s the very next step? (optional)" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <PropertyRow label="Type">
            <OptionField variant="property" kind="select" options={PROJECT_TYPES} value={type} onChange={setType} />
          </PropertyRow>
          <PropertyRow label="Lead">
            <PersonField variant="property" people={people.list} value={lead} onChange={setLead} />
          </PropertyRow>
          <PropertyRow label="Deadline">
            <DateField variant="property" value={deadline} onChange={setDeadline} placeholder="Pick a day" />
          </PropertyRow>
          <PropertyRow label="Client">
            <input
              placeholder="Optional"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="h-9 w-full rounded-xl bg-transparent px-1.5 text-[15px] font-bold outline-none placeholder:text-fg-3"
            />
          </PropertyRow>
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
