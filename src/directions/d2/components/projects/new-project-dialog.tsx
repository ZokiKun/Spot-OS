"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { todayISO } from "@/directions/d2/lib/utils";
import { useRouter } from "next/navigation";
import type { ProjectType } from "@/directions/d2/lib/types";
import { PROJECT_TYPES } from "@/directions/d2/lib/constants";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { cn } from "@/directions/d2/lib/utils";
import { Dialog } from "@/directions/d2/components/ui/dialog";
import { TextInput } from "@/directions/d2/components/ui/input";
import { DateField, PersonField } from "@/directions/d2/components/ui/fields";
import { PillButton, PillTabs } from "@/directions/d2/components/ui/chunk";

const ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶"];

/** Two questions up front (what, and what kind); everything else is optional and folded. */
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
  const [more, setMore] = useState(false);

  const reset = () => {
    setName("");
    setClient("");
    setDeadline(null);
    setNextAction("");
    setIcon("📁");
    setMore(false);
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
          <PillButton tone="outline" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton onClick={() => void submit()} disabled={!name.trim()}>
            Create project
          </PillButton>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-cream text-[28px]">{icon}</span>
          <input
            autoFocus
            placeholder="What’s the project called?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 min-w-0 flex-1 rounded-[20px] bg-input px-5 text-[17px] outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1.5px_var(--text)]"
          />
        </div>
        <div>
          <div className="mb-2 text-[13px] text-fg-2">What kind?</div>
          <PillTabs size="sm" value={type} onChange={setType} items={PROJECT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </div>
        <div>
          <div className="mb-2 text-[13px] text-fg-2">What’s the first step?</div>
          <TextInput placeholder="e.g. Send the kickoff questions" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg">
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
          {more ? "Fewer details" : "Icon, client, lead and deadline"}
        </button>
        {more && (
          <div className="anim-fade space-y-4 rounded-[22px] bg-hover p-4">
            <div className="flex flex-wrap gap-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn("flex size-9 items-center justify-center rounded-full text-[18px] hover:bg-hover", icon === i && "bg-elevated shadow-card")}
                >
                  {i}
                </button>
              ))}
            </div>
            <TextInput placeholder="Client (optional)" value={client} onChange={(e) => setClient(e.target.value)} />
            <div className="grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-1 text-[14px]">
              <span className="text-fg-2">Lead</span>
              <PersonField variant="property" people={people.list} value={lead} onChange={setLead} />
              <span className="text-fg-2">Deadline</span>
              <DateField variant="property" value={deadline} onChange={setDeadline} />
            </div>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
