"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Bot, Building2, Database, Palette, Plug, Settings, Wallet } from "lucide-react";
import type { Profile } from "@/lib/types";
import { MEMBER_COLORS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { getDemoAdapter } from "@/lib/data";
import { buildSpotMd } from "@/lib/spot-md";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { usePref } from "@/lib/hooks";
import { cn, downloadFile, timeAgo } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { PALETTES, TYPEFACES, useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { EditableText, TextInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { isGooglePickerConfigured } from "@/components/library/google-picker";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { SettingsRow, SettingsSection } from "./settings-ui";
import { DESKTOP_NOTIFY_PREF } from "@/components/shell/inbox";
import { FinanceSettings } from "./finance-settings";
import { PushToFix } from "./push-to-fix";
import { useConfirm } from "@/components/ui/confirm";

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "automation", label: "Automation", icon: Bot },
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
          {current.id === "automation" && <PushToFix />}
          {current.id === "integrations" && <Integrations />}
          {current.id === "data" && <DataSettings />}
        </div>
      </div>
    </Page>
  );
}

function Appearance() {
  const { pref, setPref, palette, setPalette, typeface, setTypeface } = useTheme();
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
      <div className="py-3">
        <div className="text-[14px]">Colour theme</div>
        <div className="mt-0.5 text-[12px] text-fg-2">Sets the accent colour and tints the sidebar and surfaces. Works in light and dark.</div>
        <div role="radiogroup" aria-label="Colour theme" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PALETTES.map((p) => {
            const selected = p.id === palette;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPalette(p.id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg p-2 text-left text-[13px] transition-shadow",
                  selected ? "font-medium shadow-[inset_0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover",
                )}
              >
                <span className="flex h-10 w-full overflow-hidden rounded-md shadow-[inset_0_0_0_1px_var(--border)]">
                  <span className="w-1/3" style={{ background: p.swatch[1] }} />
                  <span className="flex flex-1 flex-col justify-center gap-1 bg-white px-1.5">
                    <span className="h-1.5 w-3/4 rounded-full" style={{ background: p.swatch[0] }} />
                    <span className="h-1 w-1/2 rounded-full bg-[#e3e2e0]" />
                  </span>
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="py-3">
        <div className="text-[14px]">Typeface</div>
        <div className="mt-0.5 text-[12px] text-fg-2">The fonts used for headings and body text.</div>
        <div role="radiogroup" aria-label="Typeface" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TYPEFACES.map((t) => {
            const selected = t.id === typeface;
            const studio = t.id === "studio";
            const system = "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTypeface(t.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg p-3 text-left transition-shadow",
                  selected ? "shadow-[inset_0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover",
                )}
              >
                <span className="text-[26px] leading-tight" style={{ fontFamily: studio ? `"Projekt Blackbird", ${system}` : system, fontWeight: studio ? 400 : 700 }}>
                  Studio Spot
                </span>
                <span className="text-[13px] text-fg-2" style={{ fontFamily: studio ? `"Red Hat Text", ${system}` : system }}>
                  The quick brown fox jumps over the lazy dog.
                </span>
                <span className={cn("mt-1 text-[12px] text-fg-3", selected && "font-medium text-fg")} style={{ fontFamily: system }}>
                  {t.label} · {t.heading === t.body ? t.heading : `${t.heading} + ${t.body}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSection>
  );
}

type NotifyPermission = NotificationPermission | "unsupported";
const readPermission = (): NotifyPermission => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
/** Re-read the permission when the browser reports a change, or when the tab regains focus (after site settings). */
function subscribePermission(cb: () => void) {
  let status: PermissionStatus | null = null;
  navigator.permissions
    ?.query({ name: "notifications" as PermissionName })
    .then((s) => {
      status = s;
      s.addEventListener("change", cb);
    })
    .catch(() => {});
  window.addEventListener("focus", cb);
  document.addEventListener("visibilitychange", cb);
  return () => {
    status?.removeEventListener("change", cb);
    window.removeEventListener("focus", cb);
    document.removeEventListener("visibilitychange", cb);
  };
}

/**
 * Ask the browser. Must run straight from the click (no await before it) or Chrome ignores it.
 * Older Safari only supports the callback form; resolving from both covers either.
 */
function askPermission(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    try {
      const p = Notification.requestPermission(resolve);
      if (p && typeof p.then === "function") p.then(resolve, () => resolve(Notification.permission));
    } catch {
      resolve(Notification.permission);
    }
  });
}

const UNBLOCK_STEPS = [
  "Click the icon to the left of the address bar (🔒 or the settings slider).",
  "Find Notifications and switch it to Allow.",
  "Come back to this tab — this page updates by itself.",
];

function Notifications() {
  const toast = useToast();
  const [desktop, setDesktop] = usePref(DESKTOP_NOTIFY_PREF, false);
  const permission = useSyncExternalStore(subscribePermission, readPermission, () => "default" as NotifyPermission);
  // "asking": the prompt is up (or Chrome tucked it into the address bar); "dismissed": closed without choosing.
  const [ask, setAsk] = useState<"idle" | "asking" | "dismissed">("idle");
  const [tested, setTested] = useState(false);
  const on = desktop && permission === "granted";

  const test = () => {
    try {
      const n = new Notification("Spot OS notifications are on", { body: "You’ll get one like this when someone @mentions you.", icon: "/icon.png" });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      setTested(true);
    } catch {
      toast.show({ title: "Couldn’t show a notification", description: "Your system may be blocking them — check your computer’s notification settings for this browser.", tone: "error" });
    }
  };

  const enable = () => {
    if (permission === "unsupported" || permission === "denied") return;
    if (permission === "granted") {
      setDesktop(true);
      test();
      return;
    }
    setAsk("asking");
    void askPermission().then((result) => {
      if (result === "granted") {
        setAsk("idle");
        setDesktop(true);
        toast.show({ title: "Desktop notifications are on", tone: "success" });
        test();
      } else {
        // "denied" re-renders into the blocked state via the permission store.
        setAsk(result === "denied" ? "idle" : "dismissed");
      }
    });
  };

  const disable = () => {
    setDesktop(false);
    setTested(false);
  };

  let status: React.ReactNode;
  let action: React.ReactNode = null;
  if (permission === "unsupported") {
    status = "This browser doesn’t support desktop notifications. On iPhone or iPad, add Spot OS to your Home Screen first.";
  } else if (permission === "denied") {
    status = (
      <>
        <span className="font-medium text-danger">Blocked by your browser.</span> To turn them on:
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          {UNBLOCK_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </>
    );
    action = <Button onClick={() => window.location.reload()}>Check again</Button>;
  } else if (on) {
    status = (
      <>
        <span className="font-medium text-fg">On for this device.</span> You’ll get a system notification when you’re mentioned and Spot OS is in the background.
        {tested && " Didn’t see the test? Allow notifications for this browser in your computer’s settings (macOS: System Settings → Notifications)."}
      </>
    );
    action = (
      <div className="flex items-center gap-2">
        <Button onClick={test}>Send a test</Button>
        <Button variant="ghost" onClick={disable}>
          Turn off
        </Button>
      </div>
    );
  } else {
    status =
      ask === "asking" ? (
        <span className="text-fg">
          Waiting for your browser — choose <b>Allow</b> in the prompt near the address bar. No prompt? Click the bell icon in the address bar.
        </span>
      ) : ask === "dismissed" ? (
        <span className="text-fg">The prompt was closed without choosing. Click the button again and pick Allow.</span>
      ) : (
        "Get a system notification when you’re mentioned and Spot OS is in the background. Saved on this device."
      );
    action = (
      <Button variant="primary" onClick={enable}>
        <Bell className="size-3.5" /> Turn on
      </Button>
    );
  }

  return (
    <>
      <SettingsSection
        title="Mentions"
        description="Type @ in a project note, task description, calendar note or project notes to mention a member. They get a notification in their Inbox (sidebar) — live, while Spot OS is open."
      >
        <SettingsRow label="Desktop notifications" description={status}>
          {action}
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
            ? "Each person has their own login in one shared workspace. Invite new members from the Supabase dashboard (Authentication → Users → Invite). Public sign-up is disabled. View-only members (e.g. bots) can see everything but change nothing."
            : "In demo mode, members are local sample profiles. With Supabase, each person gets their own login. View-only members (e.g. bots) can see everything but change nothing."
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
  const { update, me, canEdit } = useWorkspace();
  const isMe = profile.id === me?.id;
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
      {canEdit && !isMe ? (
        <div className="flex shrink-0 gap-1" role="group" aria-label={`Access for ${profile.full_name}`}>
          {(["editor", "viewer"] as const).map((a) => (
            <Button key={a} size="sm" variant={profile.access === a ? "primary" : "secondary"} onClick={() => profile.access !== a && void update("profiles", profile.id, { access: a })}>
              {a === "editor" ? "Can edit" : "View only"}
            </Button>
          ))}
        </div>
      ) : (
        <span className="shrink-0 text-[12px] text-fg-2">{profile.access === "viewer" ? "View only" : "Can edit"}</span>
      )}
      {isMe && <span className="rounded-[3px] bg-active px-1.5 text-[11px] text-fg-2">You</span>}
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
        <SettingsRow label="Finance" description="Uploaded monthly as an Excel or CSV file under Finance. Spot OS never connects to the spreadsheet.">
          <Status ok={fin?.kind === "upload" && !!fin.last_synced_at}>
            {fin?.kind === "demo" ? "Sample data" : fin?.last_synced_at ? `Updated ${timeAgo(fin.last_synced_at)}` : "Nothing uploaded"}
          </Status>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}

function DataSettings() {
  const { data, mode } = useWorkspace();
  const ask = useConfirm();
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
                void ask({ title: "Reset the demo workspace?", description: "Local changes will be lost.", confirmLabel: "Reset" }).then((ok) => {
                  if (!ok) return;
                  demo.reset();
                  window.location.reload();
                });
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
