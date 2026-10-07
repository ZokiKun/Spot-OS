"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Monitor, Moon, Search, Settings, Sun } from "lucide-react";
import { readPref } from "@/directions/d3/lib/hooks";
import { NAV_ITEMS } from "@/directions/d3/lib/constants";
import { useWorkspace } from "@/directions/d3/lib/store";
import { attentionItems } from "@/directions/d3/lib/selectors";
import { cn } from "@/directions/d3/lib/utils";
import { getDemoAdapter } from "@/directions/d3/lib/data";
import { Avatar } from "@/directions/d3/components/ui/avatar";
import { Popover, usePopover } from "@/directions/d3/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/directions/d3/components/ui/menu";
import { NAV_ART, SpotMark, Wordmark } from "./icons";
import { useShell } from "./shell-context";
import { useTheme } from "./theme";

export function useNavBadge() {
  const { data, me } = useWorkspace();
  const count = useMemo(
    () => attentionItems(data, { meId: me?.id ?? null, mine: true }).filter((i) => i.severity === "high").length,
    [data, me],
  );
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(readPref("attention-badge", true));
    sync();
    window.addEventListener("spotos:prefs", sync);
    return () => window.removeEventListener("spotos:prefs", sync);
  }, []);
  return on ? count : 0;
}

/** Duolingo-style nav item: illustrated icon + uppercase label; selected = blue outline pill. */
function NavItem({ href, art, label, active, badge }: { href: string; art: string; label: string; active: boolean; badge?: number }) {
  const Art = NAV_ART[art]!;
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "label-caps relative flex h-[52px] items-center gap-4 rounded-xl border-2 px-3 text-[14.5px] transition-colors duration-100 max-lg:justify-center max-lg:px-0",
        active ? "border-line-selected bg-selected text-blue" : "border-transparent text-fg-2 hover:bg-hover",
      )}
    >
      <Art size={32} />
      <span className="min-w-0 flex-1 truncate max-lg:hidden">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[11px] font-extrabold text-white max-lg:absolute max-lg:right-1 max-lg:top-1">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const badge = useNavBadge();
  const { setAnchor, ...more } = usePopover<HTMLButtonElement>();

  return (
    <nav className="flex h-full w-full flex-col bg-sidebar px-4 pb-4 pt-6 max-lg:px-3" aria-label="Main">
      <Link href="/" className="mb-6 flex h-10 items-center px-3 max-lg:justify-center max-lg:px-0" aria-label="Spot OS home">
        <Wordmark className="text-[30px] leading-none max-lg:hidden" />
        <span className="lg:hidden">
          <SpotMark size={34} />
        </span>
      </Link>
      <div className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            art={item.icon}
            label={item.label}
            active={isActivePath(pathname, item.href)}
            badge={item.href === "/" ? badge : undefined}
          />
        ))}
        <button
          ref={setAnchor}
          type="button"
          onClick={more.toggle}
          title="More"
          className={cn(
            "label-caps flex h-[52px] items-center gap-4 rounded-xl border-2 px-3 text-left text-[14.5px] transition-colors duration-100 max-lg:justify-center max-lg:px-0",
            more.open || isActivePath(pathname, "/settings") ? "border-line-selected bg-selected text-blue" : "border-transparent text-fg-2 hover:bg-hover",
          )}
        >
          <NAV_ART.more size={32} />
          <span className="flex-1 max-lg:hidden">More</span>
        </button>
        <MoreMenu open={more.open} onClose={more.close} anchor={more.anchor} />
      </div>
    </nav>
  );
}

/** "More" menu: search, settings, theme, demo member switch, log out. */
export function MoreMenu({ open, onClose, anchor }: { open: boolean; onClose: () => void; anchor: HTMLElement | null }) {
  const router = useRouter();
  const { data, me, signOut, mode } = useWorkspace();
  const { openSearch } = useShell();
  const { pref, setPref } = useTheme();
  const demo = getDemoAdapter();
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} width={270}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <Avatar profile={me} size={40} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-extrabold">{me?.full_name ?? "—"}</div>
          <div className="truncate text-[12px] font-semibold text-fg-2">{me?.email}</div>
        </div>
      </div>
      <MenuList>
        <MenuItem
          icon={<Search className="size-4" strokeWidth={2.5} />}
          hint="⌘K"
          onSelect={() => {
            onClose();
            openSearch();
          }}
        >
          Search
        </MenuItem>
        <MenuItem icon={<Settings className="size-4" strokeWidth={2.5} />} onSelect={() => go("/settings")}>
          Settings
        </MenuItem>
        <MenuDivider />
        <MenuLabel>Theme</MenuLabel>
        <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
          {(
            [
              ["system", "Auto", Monitor],
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPref(value)}
              className={cn(
                "label-caps flex h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 border-b-4 text-[10.5px]",
                pref === value ? "border-line-selected bg-selected text-blue" : "border-line text-fg-2 hover:bg-subtle",
              )}
            >
              <Icon className="size-4" strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>
        {demo && (
          <>
            <MenuDivider />
            <MenuLabel>Demo — switch member</MenuLabel>
            {data.profiles.map((p) => (
              <MenuItem
                key={p.id}
                icon={<Avatar profile={p} size={20} />}
                selected={p.id === me?.id}
                onSelect={() => {
                  demo.signInAs(p.id);
                  window.location.reload();
                }}
              >
                {p.full_name}
              </MenuItem>
            ))}
          </>
        )}
        <MenuDivider />
        <MenuItem icon={<LogOut className="size-4" strokeWidth={2.5} />} onSelect={() => void signOut()}>
          Log out
        </MenuItem>
        {mode === "demo" && (
          <Link
            href="/settings?section=data"
            onClick={onClose}
            className="mt-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-bold text-fg-3 hover:bg-hover"
          >
            <span className="size-2 rounded-full bg-orange" />
            Demo mode — data stays in this browser
          </Link>
        )}
      </MenuList>
    </Popover>
  );
}
