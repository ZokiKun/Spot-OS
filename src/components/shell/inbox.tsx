"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, CheckCheck, Inbox as InboxIcon } from "lucide-react";
import type { Notification as SpotNotification } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { readPref } from "@/lib/hooks";
import { cn, firstName, nowISO, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/misc";

export const DESKTOP_NOTIFY_PREF = "desktop-notifications";

const KIND_LABEL: Record<SpotNotification["entity_type"], string> = {
  project: "project",
  task: "task",
  calendar_note: "note",
  kb_page: "Spot Base page",
};

/** My notifications, newest first. */
export function useMyNotifications() {
  const { data, me } = useWorkspace();
  return useMemo(
    () => data.notifications.filter((n) => n.recipient_id === me?.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.notifications, me],
  );
}

/** Sidebar row + popover inbox. */
export function InboxButton({ onNavigate }: { onNavigate?: () => void }) {
  const mine = useMyNotifications();
  const unread = mine.filter((n) => !n.read_at).length;
  const { setAnchor: anchorRef, ...pop } = usePopover<HTMLButtonElement>();
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={pop.toggle}
        className={cn("flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[14px] transition-colors duration-75", pop.open ? "bg-active text-fg" : "text-fg-2 hover:bg-hover")}
      >
        <span className="flex size-[22px] items-center justify-center">
          <InboxIcon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <span className="flex-1 text-left">Inbox</span>
        {unread > 0 && <span className="rounded-full bg-[var(--dot-red)] px-1.5 text-[11px] font-medium leading-4 text-white">{unread}</span>}
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={380}>
        <InboxPanel
          onOpen={() => {
            pop.close();
            onNavigate?.();
          }}
        />
      </Popover>
    </>
  );
}

function InboxPanel({ onOpen }: { onOpen: () => void }) {
  const { update } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const mine = useMyNotifications();
  const [filter, setFilter] = useState<"unread" | "all">(() => (mine.some((n) => !n.read_at) ? "unread" : "all"));
  const list = filter === "unread" ? mine.filter((n) => !n.read_at) : mine;
  const unread = mine.filter((n) => !n.read_at);

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        <span className="mr-auto text-[14px] font-semibold">Inbox</span>
        {(["unread", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn("h-6 rounded-full px-2 text-[12px] capitalize", filter === f ? "bg-active font-medium" : "text-fg-2 hover:bg-hover")}
          >
            {f}
            {f === "unread" && unread.length > 0 && ` ${unread.length}`}
          </button>
        ))}
        <button
          type="button"
          title="Mark all as read"
          aria-label="Mark all as read"
          disabled={!unread.length}
          onClick={() => unread.forEach((n) => void update("notifications", n.id, { read_at: nowISO() }))}
          className="ml-1 flex size-6 items-center justify-center rounded text-fg-2 hover:bg-hover disabled:opacity-30"
        >
          <CheckCheck className="size-4" />
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-1">
        {list.length === 0 ? (
          <EmptyState
            icon={<AtSign className="size-5" />}
            title={filter === "unread" ? "You’re all caught up" : "No notifications yet"}
            description="When someone @mentions you in a project, task or note, it shows up here."
            className="py-8"
          />
        ) : (
          list.map((n) => {
            const actor = people.get(n.actor_id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read_at) void update("notifications", n.id, { read_at: nowISO() });
                  router.push(n.href);
                  onOpen();
                }}
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-hover"
              >
                <Avatar profile={actor} size={26} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] leading-snug">
                    <span className="font-medium">{actor?.full_name ?? "Someone"}</span> mentioned you in the {KIND_LABEL[n.entity_type]}{" "}
                    <span className="font-medium">{n.entity_label}</span>
                  </div>
                  {n.excerpt && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-fg-2">{n.excerpt}</div>}
                  <div className="mt-0.5 text-[11.5px] text-fg-3">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Announces notifications that arrive while Spot OS is open:
 * an in-app toast, plus a desktop notification when the person has turned those on.
 */
export function NotificationWatcher() {
  const { status } = useWorkspace();
  const people = useProfiles();
  const router = useRouter();
  const toast = useToast();
  const mine = useMyNotifications();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (status !== "ready") return;
    if (!seen.current) {
      seen.current = new Set(mine.map((n) => n.id)); // existing ones are not "new"
      return;
    }
    for (const n of mine) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read_at) continue;
      const who = firstName(people.get(n.actor_id)?.full_name) || "Someone";
      const title = `${who} mentioned you`;
      toast.show({ title, description: n.entity_label, action: { label: "Open", onClick: () => router.push(n.href) } });
      if (readPref(DESKTOP_NOTIFY_PREF, false) && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const dn = new Notification(`${title} · Spot OS`, { body: `${n.entity_label}${n.excerpt ? ` — ${n.excerpt}` : ""}`, tag: n.id });
        dn.onclick = () => {
          window.focus();
          router.push(n.href);
          dn.close();
        };
      }
    }
  }, [mine, status, people, toast, router]);

  return null;
}
