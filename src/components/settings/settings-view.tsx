"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Building2, Database, Palette, Plug, Settings, Wallet } from "lucide-react";
import type { Profile } from "@/lib/types";
import { MEMBER_COLORS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { getDemoAdapter } from "@/lib/data";
import { buildSpotMd } from "@/lib/spot-md";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { readPref, writePref } from "@/lib/hooks";
import { cn, downloadFile } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui/button";
import { EditableText, TextInput, Toggle } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { isGooglePickerConfigured } from "@/components/library/google-picker";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { SettingsRow, SettingsSection } from "./settings-ui";
import { DESKTOP_NOTIFY_PREF } from "@/components/shell/inbox";
import { FinanceSettings } from "./finance-settings";

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "data", label: "Data", icon: Database },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const section = (params.get("section") as SectionId) || "appearance";
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <Page crumbs={[{ label: "Settings", icon: <Settings className="size-4" /> }]}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12">
        <nav className="flex gap-0.5 overflow-x-auto md:sticky md:top-16 md:flex-col md:self-start" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => router.replace(`${pathname}?section=${s.id}`, { scroll: false })}
              className={cn(
                "flex h-[30px] shrink-0 items-center gap-2 rounded-md px-2 text-[14px] transition-colors",
                s.id === current.id ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
              )}
            >
              <s.icon className="size-4" strokeWidth={1.8} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <h1 className="mb-6 text-[24px] font-semibold">{current.label}</h1>
          {current.id === "appearance" && <Appearance />}
          {current.id === "notifications" && <Notifications />}
          {current.id === "workspace" && <WorkspaceSettings />}
          {current.id === "finance" && <FinanceSettings />}
          {current.id === "integrations" && <Integrations />}
          {current.id === "data" && <DataSettings />}
        </div>
      </div>
    </Page>
  );
}

function Appearance() {
  const { pref, setPref } = useTheme();
  return (
    <SettingsSection title="Theme" description="Saved on this device.">
      <SettingsRow label="Interface theme">
        <div className="flex gap-1">
          {(["system", "light", "dark"] as const).map((t) => (
            <Button key={t} variant={pref === t ? "primary" : "secondary"} onClick={() => setPref(t)}>
              {t === "system" ? "System" : t === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

function Notifications() {
  const [desktop, setDesktop] = useState(() => readPref(DESKTOP_NOTIFY_PREF, false));
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(() => (supported ? Notification.permission : "denied"));
  return (
    <>
      <SettingsSection
        title="Mentions"
        description="Type @ in a project note, task description, calendar note or project notes to mention a member. They get a notification in their Inbox (sidebar) — live, while Spot OS is open."
      >
        <SettingsRow
          label="Desktop notifications"
          description={
            !supported
              ? "This browser doesn’t support desktop notifications."
              : permission === "denied"
                ? "Blocked by the browser. Allow notifications for this site in your browser settings, then reload."
                : "Also show a system notification when you’re mentioned and Spot OS is in the background. Saved on this device."
          }
        >
          <Toggle
            label="Desktop notifications"
            checked={desktop && permission === "granted"}
            onChange={async (v) => {
              if (v && supported && Notification.permission !== "granted") {
                const p = await Notification.requestPermission();
                setPermission(p);
                if (p !== "granted") return;
              }
              setDesktop(v);
              writePref(DESKTOP_NOTIFY_PREF, v);
            }}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}

function WorkspaceSettings() {
  const { data, update, create, mode } = useWorkspace();
  const ws = data.settings.find((s) => s.key === "workspace");
  const value = (ws?.value ?? {}) as { name?: string; currency?: string; week_starts_on?: number };
  const save = (patch: Record<string, unknown>) => {
    if (ws) void update("settings", ws.id, { value: { ...ws.value, ...patch } });
    else void create("settings", { key: "workspace", value: patch });
  };
  return (
    <>
      <SettingsSection title="Workspace">
        <SettingsRow label="Name">
          <TextInput className="w-64" defaultValue={value.name ?? "Studio Spot"} onBlur={(e) => e.target.value.trim() && save({ name: e.target.value.trim() })} />
        </SettingsRow>
        <SettingsRow label="Week starts on">
          <div className="flex gap-1">
            {[
              [1, "Monday"],
              [0, "Sunday"],
            ].map(([v, l]) => (
              <Button key={v} variant={(value.week_starts_on ?? 1) === v ? "primary" : "secondary"} onClick={() => save({ week_starts_on: v })}>
                {l}
              </Button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection
        title="Members"
        description={
          mode === "supabase"
            ? "Each person has their own login in one shared workspace. Invite new members from the Supabase dashboard (Authentication → Users → Invite). Public sign-up is disabled."
            : "In demo mode, members are local sample profiles. With Supabase, each person gets their own login."
        }
      >
        {data.profiles.map((p) => (
          <MemberRow key={p.id} profile={p} />
        ))}
      </SettingsSection>
    </>
  );
}

function MemberRow({ profile }: { profile: Profile }) {
  const { update, me } = useWorkspace();
  const { setAnchor: popAnchorRef, ...pop } = usePopover();
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <button ref={popAnchorRef} type="button" onClick={pop.toggle} aria-label="Change colour" className="rounded-full">
        <Avatar profile={profile} size={32} />
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor}>
        <div className="flex gap-1 p-2">
          {MEMBER_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => (void update("profiles", profile.id, { color: c }), pop.close())} className={cn(`tag-${c}`, "size-6 rounded-full", profile.color === c && "ring-2 ring-accent ring-offset-1")} aria-label={c} />
          ))}
        </div>
      </Popover>
      <div className="min-w-0 flex-1">
        <EditableText value={profile.full_name} onCommit={(full_name) => full_name && void update("profiles", profile.id, { full_name })} className="text-[14px] font-medium" />
        <div className="text-[12px] text-fg-2">{profile.email}</div>
      </div>
      <div className="w-44">
        <EditableText value={profile.role_title ?? ""} placeholder="Role" onCommit={(role_title) => void update("profiles", profile.id, { role_title: role_title || null })} className="text-right text-[13px] text-fg-2" />
      </div>
      {profile.id === me?.id && <span className="rounded-[3px] bg-active px-1.5 text-[11px] text-fg-2">You</span>}
    </div>
  );
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <span className={cn("size-2 rounded-full", ok ? "bg-[var(--dot-green)]" : "bg-[var(--dot-gray)]")} />
      {children}
    </span>
  );
}

function Integrations() {
  const { mode, data } = useWorkspace();
  const fin = data.finance_sources[0];
  return (
    <>
      <SettingsSection title="Backend">
        <SettingsRow label="Supabase" description={mode === "supabase" ? `Connected to ${new URL(SUPABASE_URL).host}. Database, auth, storage and realtime.` : "Not configured — running in local demo mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."}>
          <Status ok={mode === "supabase"}>{mode === "supabase" ? "Connected" : "Demo mode"}</Status>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Google">
        <SettingsRow label="Google Drive" description="Library items link to Drive. Drive stays the main file store; Spot OS doesn’t copy files.">
          <Status ok>Links supported</Status>
        </SettingsRow>
        <SettingsRow
          label="Google Picker"
          description={isGooglePickerConfigured ? "Pick Drive files straight from the Add to Library dialog." : "Optional. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY to browse Drive from Spot OS."}
        >
          <Status ok={isGooglePickerConfigured}>{isGooglePickerConfigured ? "Enabled" : "Not configured"}</Status>
        </SettingsRow>
        <SettingsRow
          label="Google Calendar"
          description={
            isGoogleCalendarConfigured
              ? "Calendar → Export → Sync pushes deadlines, tasks due and notes for a week, month or year into your own Google Calendar. Re-syncing updates events instead of duplicating them."
              : "Calendar → Export downloads a week, month or year as an .ics file that Google Calendar imports. For one-click sync, set NEXT_PUBLIC_GOOGLE_CLIENT_ID and enable the Google Calendar API."
          }
        >
          <Status ok>{isGoogleCalendarConfigured ? "Sync enabled" : ".ics import"}</Status>
        </SettingsRow>
        <SettingsRow label="Google Sheets (finance)" description="Configured under Finance.">
          <Status ok={fin?.kind === "google_sheet_csv" && !!fin.url}>{fin?.kind === "google_sheet_csv" && fin.url ? "Connected" : fin?.kind === "demo" ? "Sample data" : "Not connected"}</Status>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}

function DataSettings() {
  const { data, mode } = useWorkspace();
  const demo = getDemoAdapter();
  const ws = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";
  return (
    <>
      <SettingsSection title="Export" description="Your data is always yours. Exports include everything stored in Spot OS (not Google Drive files).">
        <SettingsRow label="Workspace data" description="All projects, tasks, notes, library, reviews and Spot Base as JSON.">
          <Button
            onClick={() => {
              const { finance_snapshots: _drop, ...rest } = data;
              void _drop;
              downloadFile(`spot-os-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(rest, null, 2), "application/json");
            }}
          >
            Export JSON
          </Button>
        </SettingsRow>
        <SettingsRow label="SPOT.md" description="The studio context document generated from Spot Base.">
          <Button onClick={() => downloadFile("SPOT.md", buildSpotMd(data.kb_pages, ws), "text/markdown")}>Download</Button>
        </SettingsRow>
      </SettingsSection>
      {mode === "demo" && demo && (
        <SettingsSection title="Demo data" description="Demo mode stores everything in this browser’s local storage.">
          <SettingsRow label="Reset demo workspace" description="Restores the sample projects, tasks and notes. Your local changes are lost.">
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Reset the demo workspace? Local changes will be lost.")) {
                  demo.reset();
                  window.location.reload();
                }
              }}
            >
              Reset
            </Button>
          </SettingsRow>
        </SettingsSection>
      )}
    </>
  );
}
