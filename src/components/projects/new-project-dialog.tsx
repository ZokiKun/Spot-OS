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
import { DateField, OptionField, PersonField } from "@/components/ui/fields";

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
      note: null,
      tags: [],
      cover: null,
      cover_position: 50,
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
          <span className="text-fg-2">Next action</span>
          <TextInput placeholder="The one next meaningful step" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
