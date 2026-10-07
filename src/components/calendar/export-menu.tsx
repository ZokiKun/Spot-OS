"use client";

import { useState } from "react";
import { CalendarCheck2, Download, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { collectEvents, GOOGLE_CALENDAR_IMPORT_URL, rangeFor, toICS, toMarkdown, type ExportRange } from "@/lib/calendar-export";
import { isGoogleCalendarConfigured, syncToGoogleCalendar } from "@/lib/google-calendar";
import { cn, downloadFile, plural, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";

/** Export the week / month / year around the selected day — as .ics (Google, Apple, Outlook) or Markdown. */
export function CalendarExportMenu({ selected, defaultRange, weekStartsOn }: { selected: string; defaultRange: ExportRange; weekStartsOn: 0 | 1 }) {
  const { data } = useWorkspace();
  const toast = useToast();
  const { setAnchor, ...pop } = usePopover();
  const [range, setRange] = useState<ExportRange>(defaultRange);
  const [syncing, setSyncing] = useState(false);
  const workspace = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";

  const r = rangeFor(range, selected, weekStartsOn);
  const events = collectEvents(data, r.start, r.end);
  const base = `spot-os-${range}-${slugify(r.label)}`;
  const name = `${workspace} · ${r.label}`;

  const ics = () => downloadFile(`${base}.ics`, toICS(events, name), "text/calendar");

  return (
    <>
      <Button ref={setAnchor} variant="secondary" onClick={pop.toggle}>
        <Download className="size-3.5" /> Export
      </Button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={300}>
        <div className="border-b border-line p-2">
          <div className="mb-1.5 px-1 text-[12px] font-medium text-fg-2">Period</div>
          <div className="flex gap-1">
            {(["week", "month", "year"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRange(v)}
                className={cn("h-7 flex-1 rounded-md text-[13px] capitalize transition-colors", range === v ? "bg-active font-medium" : "text-fg-2 hover:bg-hover")}
              >
                {v === "week" ? "Weekly" : v === "month" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          <div className="mt-2 px-1 text-[12px] text-fg-3">
            {r.label} · {plural(events.length, "item")} (deadlines, tasks due, notes)
          </div>
        </div>
        <MenuList>
          <MenuLabel>Download</MenuLabel>
          <MenuItem icon={<CalendarCheck2 className="size-4" />} hint=".ics" onSelect={() => (ics(), pop.close())}>
            Calendar file
          </MenuItem>
          <MenuItem
            icon={<FileText className="size-4" />}
            hint=".md"
            onSelect={() => (downloadFile(`${base}.md`, toMarkdown(events, name), "text/markdown"), pop.close())}
          >
            Notes digest
          </MenuItem>
          <MenuDivider />
          <MenuLabel>Google Calendar</MenuLabel>
          {isGoogleCalendarConfigured && (
            <MenuItem
              icon={<RefreshCw className={cn("size-4", syncing && "animate-spin")} />}
              disabled={syncing || events.length === 0}
              onSelect={async () => {
                setSyncing(true);
                try {
                  const n = await syncToGoogleCalendar(events);
                  toast.show({ title: `Synced ${plural(n, "item")} to Google Calendar`, description: "Syncing again updates them instead of duplicating." });
                  pop.close();
                } catch (err) {
                  toast.show({ title: "Couldn’t sync to Google Calendar", description: err instanceof Error ? err.message : String(err), tone: "error" });
                } finally {
                  setSyncing(false);
                }
              }}
            >
              Sync {r.label}
            </MenuItem>
          )}
          <MenuItem
            icon={<ExternalLink className="size-4" />}
            onSelect={() => {
              ics();
              window.open(GOOGLE_CALENDAR_IMPORT_URL, "_blank", "noopener");
              toast.show({ title: "Calendar file downloaded", description: "In Google Calendar, choose Import → select the .ics file → Import." });
              pop.close();
            }}
          >
            Import into Google Calendar…
          </MenuItem>
          {!isGoogleCalendarConfigured && (
            <p className="px-2 pb-1 pt-0.5 text-[11.5px] leading-snug text-fg-3">
              Direct one-click sync turns on when a Google OAuth client is set (Settings → Integrations).
            </p>
          )}
        </MenuList>
      </Popover>
    </>
  );
}
