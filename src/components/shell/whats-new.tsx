"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { CHANGELOG, LATEST_RELEASE, unseenReleases, type Release } from "@/lib/changelog";
import { usePref } from "@/lib/hooks";
import { formatDay } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SEEN_PREF = "whats-new-seen";
const OPEN_EVENT = "spotos:whats-new";

/** Open the "What's new" screen with every release (sidebar, command palette…). */
export const openWhatsNew = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Whether there's a release this device hasn't seen (for a dot next to "What's new"). */
export function useHasUnseenRelease() {
  const [seen] = usePref<string | null>(SEEN_PREF, null);
  return seen !== LATEST_RELEASE;
}

/**
 * "What's new": opens by itself once per release a person hasn't seen (just after the app
 * loads), and on demand with every release. Also watches for a new deploy while the app is open.
 */
export function WhatsNew() {
  const [seen, setSeen] = usePref<string | null>(SEEN_PREF, null);
  const [ready, setReady] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    // Let the app settle first, so the screen doesn't pop up mid-load.
    const t = setTimeout(() => setReady(true), 1200);
    const onOpen = () => setAll(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      clearTimeout(t);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const auto = ready && seen !== LATEST_RELEASE;
  const releases = all ? CHANGELOG : unseenReleases(seen);
  const close = () => {
    setSeen(LATEST_RELEASE);
    setAll(false);
  };

  return (
    <>
      <Dialog
        open={all || auto}
        onClose={close}
        width={560}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> What’s new in Spot OS
          </span>
        }
        footer={
          <Button variant="primary" onClick={close}>
            Got it
          </Button>
        }
      >
        <div className="space-y-6 pb-2">
          {releases.map((r) => (
            <ReleaseNotes key={r.id} release={r} />
          ))}
        </div>
      </Dialog>
      <UpdateWatcher />
    </>
  );
}

function ReleaseNotes({ release }: { release: Release }) {
  return (
    <section>
      <div className="text-[12px] font-medium text-fg-3">{formatDay(release.date)}</div>
      <h3 className="mt-0.5 text-[15px] font-semibold leading-snug">{release.title}</h3>
      <ul className="mt-2.5 space-y-2.5">
        {release.items.map((item) => (
          <li key={item.title} className="flex gap-2.5 text-[14px] leading-snug">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="min-w-0">
              <span className="font-medium">{item.title}</span>
              {item.body && <span className="block text-fg-2">{item.body}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The version this page was built from (the deploy's commit; "dev" locally). */
const BUILD = process.env.APP_VERSION ?? "dev";
const CHECK_EVERY = 5 * 60_000;

/** Notices when a newer version is live while the app is open, and offers a reload. */
function UpdateWatcher() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (BUILD === "dev" || available) return;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (version && version !== "dev" && version !== BUILD) setAvailable(true);
      } catch {
        /* offline — try again later */
      }
    };
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [available]);

  if (!available || dismissed) return null;
  return (
    <div
      role="status"
      className="no-print anim-pop fixed bottom-24 right-6 z-40 flex max-w-[calc(100vw-48px)] items-center gap-3 rounded-lg bg-[#2f2f2f] py-2.5 pl-3.5 pr-2 text-[13px] text-white shadow-menu sm:bottom-[104px] sm:right-8"
    >
      <Sparkles className="size-4 shrink-0 text-[#f5b14c]" />
      <div className="min-w-0">
        <div className="font-medium">Spot OS has been updated</div>
        <div className="text-white/65">Reload to get the newest version and see what’s new.</div>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-2.5 font-medium hover:bg-white/25"
      >
        <RefreshCw className="size-3.5" /> Reload
      </button>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
