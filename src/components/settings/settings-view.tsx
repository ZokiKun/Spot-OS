"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Building2, Check, Database, Download, Palette, Plug, RotateCcw, Wallet } from "lucide-react";
import type { Profile } from "@/lib/types";
import { MEMBER_COLORS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { getDemoAdapter } from "@/lib/data";
import { buildSpotMd } from "@/lib/spot-md";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { readPref, writePref } from "@/lib/hooks";
import { cn, downloadFile } from "@/lib/utils";
import { Page, PageTitle } from "@/components/shell/page";
import { useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui/button";
import { EditableText, TextInput, Toggle } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { PillButton, PillTabs } from "@/components/ui/chunk";
import { isGooglePickerConfigured } from "@/components/library/google-picker";
import { Choice, SettingsRow, SettingsSection, Status } from "./settings-ui";
import { FinanceSettings } from "./finance-settings";
import { DirectionSwitcher } from "./direction-switcher";

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
    <Page width="doc" crumbs={[{ label: "Settings" }]}>
      <PageTitle title="Settings" description="Make Spot OS fit the studio. Most of this is set once and forgotten." />
      <PillTabs
        className="mb-6"
        value={current.id}
        onChange={(id) => router.replace(`${pathname}?section=${id}`, { scroll: false })}
        items={SECTIONS.map((s) => ({ value: s.id, label: s.label, icon: <s.icon className="size-4" strokeWidth={1.8} /> }))}
      />
      <div key={current.id} className="anim-fade flex flex-col gap-3">
        {current.id === "appearance" && (
          <div className="space-y-8">
            <DirectionSwitcher />
            <Appearance />
          </div>
        )}
        {current.id === "notifications" && <Notifications />}
        {current.id === "workspace" && <WorkspaceSettings />}
        {current.id === "finance" && <FinanceSettings />}
        {current.id === "integrations" && <Integrations />}
        {current.id === "data" && <DataSettings />}
      </div>
    </Page>
  );
}

const THEMES = [
  { value: "system", label: "Auto", hint: "Follows your device" },
  { value: "light", label: "Light", hint: "Cream canvas" },
  { value: "dark", label: "Dark", hint: "Black canvas" },
] as const;

function Appearance() {
  const { pref, setPref } = useTheme();
  return (
    <section>
      <h2 className="text-[20px] font-medium tracking-[-0.02em]">Theme</h2>
      <p className="mt-1 text-[13.5px] text-fg-2">Saved on this device. Cards keep their colours in both.</p>
      <div role="radiogroup" aria-label="Theme" className="stagger mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {THEMES.map((t) => {
          const selected = pref === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPref(t.value)}
              className={cn(
                "press flex min-w-0 flex-col rounded-[24px] bg-elevated p-2.5 text-left transition-shadow sm:rounded-[28px] sm:p-3",
                selected && "shadow-[inset_0_0_0_2.5px_var(--text)]",
              )}
            >
              <span className="flex aspect-[4/3] overflow-hidden rounded-[18px] sm:rounded-[20px]">
                {t.value === "system" ? (
                  <>
                    <ThemeSwatch dark={false} />
                    <ThemeSwatch dark />
                  </>
                ) : (
                  <ThemeSwatch dark={t.value === "dark"} />
                )}
              </span>
              <span className="mt-3 flex items-center gap-2 px-1 pb-1">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium sm:text-[17px]">{t.label}</span>
                  <span className="hidden truncate text-[12.5px] text-fg-2 sm:block">{t.hint}</span>
                </span>
                {selected && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent sm:size-7">
                    <Check className="size-3.5" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A tiny picture of the app: canvas, a title line and four coloured chunks. */
function ThemeSwatch({ dark }: { dark: boolean }) {
  return (
    <span className={cn("flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 sm:p-3", dark ? "bg-[#0c0c0c]" : "bg-[#f2eee4]")} aria-hidden>
      <span className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-[#f4f0e6]/70" : "bg-[#151515]/70")} />
      <span className="grid flex-1 grid-cols-2 gap-1">
        <span className="rounded-[7px] bg-coral" />
        <span className="rounded-[7px] bg-sun" />
        <span className="rounded-[7px] bg-lime" />
        <span className="rounded-[7px] bg-sky" />
      </span>
    </span>
  );
}

export const ATTENTION_BADGE_PREF = "attention-badge";

function Notifications() {
  const [badge, setBadge] = useState(() => readPref(ATTENTION_BADGE_PREF, true));
  return (
    <SettingsSection
      title="In the app"
      description="Spot OS doesn’t send email or push notifications on purpose. Anything that needs you shows up on Home."
    >
      <SettingsRow label="Heads-up badge" description="Show how many urgent things are waiting for you next to Home.">
        <Toggle
          label="Heads-up badge"
          checked={badge}
          onChange={(v) => {
            setBadge(v);
            writePref(ATTENTION_BADGE_PREF, v);
            window.dispatchEvent(new Event("spotos:prefs"));
          }}
        />
      </SettingsRow>
    </SettingsSection>
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
      <SettingsSection title="Workspace" description="The studio’s name and how weeks are counted.">
        <SettingsRow label="Name">
          <TextInput
            className="w-full sm:w-64"
            defaultValue={value.name ?? "Studio Spot"}
            onBlur={(e) => e.target.value.trim() && save({ name: e.target.value.trim() })}
          />
        </SettingsRow>
        <SettingsRow label="Week starts on">
          <Choice
            label="Week starts on"
            value={value.week_starts_on ?? 1}
            onChange={(v) => save({ week_starts_on: v })}
            options={[
              { value: 1, label: "Monday" },
              { value: 0, label: "Sunday" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection
        title={`Members · ${data.profiles.length}`}
        description={
          mode === "supabase"
            ? "Everyone has their own login in one shared workspace. Invite new people from the Supabase dashboard (Authentication → Users → Invite). Public sign-up is off."
            : "In demo mode, members are sample people stored in this browser. With Supabase, everyone gets their own login."
        }
      >
        <div className="flex flex-col gap-2">
          {data.profiles.map((p) => (
            <MemberRow key={p.id} profile={p} />
          ))}
        </div>
        <p className="text-[12.5px] text-fg-3">Tap a picture to change its colour. Tap a name or role to edit it.</p>
      </SettingsSection>
    </>
  );
}

function MemberRow({ profile }: { profile: Profile }) {
  const { update, me } = useWorkspace();
  const { setAnchor: popAnchorRef, ...pop } = usePopover();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[22px] bg-hover px-3 py-2.5 sm:flex-nowrap">
      <button ref={popAnchorRef} type="button" onClick={pop.toggle} aria-label={`Change ${profile.full_name}’s colour`} className="rounded-full">
        <Avatar profile={profile} size={40} />
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor}>
        <div className="flex gap-1.5 p-2.5">
          {MEMBER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => (void update("profiles", profile.id, { color: c }), pop.close())}
              className={cn(`tag-${c}`, "size-7 rounded-full", profile.color === c && "ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg-elevated)]")}
              aria-label={c}
            />
          ))}
        </div>
      </Popover>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <EditableText
            value={profile.full_name}
            onCommit={(full_name) => full_name && void update("profiles", profile.id, { full_name })}
            className="text-[15px] font-medium"
          />
          {profile.id === me?.id && <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-accent px-2.5 text-[11.5px] text-on-accent">You</span>}
        </div>
        <div className="truncate text-[12.5px] text-fg-2">{profile.email}</div>
      </div>
      <div className="basis-full pl-[52px] sm:w-44 sm:basis-auto sm:pl-0">
        <EditableText
          value={profile.role_title ?? ""}
          placeholder="Add a role"
          onCommit={(role_title) => void update("profiles", profile.id, { role_title: role_title || null })}
          className="text-[13.5px] text-fg-2 sm:text-right"
        />
      </div>
    </div>
  );
}

function Integrations() {
  const { mode, data } = useWorkspace();
  const fin = data.finance_sources[0];
  return (
    <>
      <SettingsSection title="Where data lives" description="Spot OS keeps projects, tasks and notes in one database.">
        <SettingsRow
          label="Supabase"
          description={
            mode === "supabase"
              ? `Connected to ${new URL(SUPABASE_URL).host}. Database, login, files and live updates.`
              : "Not set up — running in demo mode in this browser. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          }
        >
          <Status ok={mode === "supabase"}>{mode === "supabase" ? "Connected" : "Demo mode"}</Status>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Google" description="Drive stays the main place for files. Spot OS only links to them.">
        <SettingsRow label="Google Drive" description="Library items link to Drive. Spot OS doesn’t copy files.">
          <Status ok>Links work</Status>
        </SettingsRow>
        <SettingsRow
          label="Google Picker"
          description={
            isGooglePickerConfigured
              ? "Pick Drive files straight from the Add to Library dialog."
              : "Optional. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY to browse Drive from Spot OS."
          }
        >
          <Status ok={isGooglePickerConfigured}>{isGooglePickerConfigured ? "On" : "Not set up"}</Status>
        </SettingsRow>
        <SettingsRow label="Google Sheets (money)" description="Set up under Finance.">
          <Status ok={fin?.kind === "google_sheet_csv" && !!fin.url}>
            {fin?.kind === "google_sheet_csv" && fin.url ? "Connected" : fin?.kind === "demo" ? "Sample data" : "Not connected"}
          </Status>
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
      <SettingsSection title="Take your data with you" description="Your data is always yours. Exports include everything stored in Spot OS (not Google Drive files).">
        <SettingsRow label="Everything" description="All projects, tasks, notes, library, reviews and Spot Base as one JSON file.">
          <PillButton
            tone="outline"
            onClick={() => {
              const { finance_snapshots: _drop, ...rest } = data;
              void _drop;
              downloadFile(`spot-os-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(rest, null, 2), "application/json");
            }}
          >
            <Download /> Export JSON
          </PillButton>
        </SettingsRow>
        <SettingsRow label="SPOT.md" description="The studio context document, built from Spot Base.">
          <PillButton tone="outline" onClick={() => downloadFile("SPOT.md", buildSpotMd(data.kb_pages, ws), "text/markdown")}>
            <Download /> Download
          </PillButton>
        </SettingsRow>
      </SettingsSection>
      {mode === "demo" && demo && (
        <SettingsSection title="Demo data" description="Demo mode keeps everything in this browser.">
          <SettingsRow label="Start over" description="Brings back the sample projects, tasks and notes. Your changes here are lost.">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                if (confirm("Reset the demo workspace? Local changes will be lost.")) {
                  demo.reset();
                  window.location.reload();
                }
              }}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
          </SettingsRow>
        </SettingsSection>
      )}
    </>
  );
}
