"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Monitor, Moon, Search, Settings, Sun, Users } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { attentionItems } from "@/lib/selectors";
import { readPref } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { getDemoAdapter } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { CircleButton } from "@/components/ui/chunk";
import { NAV_ICONS, SpotMark } from "./icons";
import { useShell } from "./shell-context";
import { useTheme } from "./theme";

function useNavState() {
  const pathname = usePathname();
  const { data, me } = useWorkspace();
  const urgent = useMemo(
    () => attentionItems(data, { meId: me?.id ?? null, mine: true }).filter((i) => i.severity === "high").length,
    [data, me],
  );
  const [badgeOn, setBadgeOn] = useState(true);
  useEffect(() => {
    const sync = () => setBadgeOn(readPref("attention-badge", true));
    sync();
    window.addEventListener("spotos:prefs", sync);
    return () => window.removeEventListener("spotos:prefs", sync);
  }, []);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return { isActive, urgent: badgeOn ? urgent : 0 };
}

/** Desktop: logo · pill navigation · search + account. Mobile: logo · search + account (nav lives in the dock). */
export function TopNav() {
  const { isActive, urgent } = useNavState();
  const { openSearch } = useShell();
  const { data } = useWorkspace();
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";

  return (
    <header className="no-print sticky top-0 z-30 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-full pr-2" aria-label={`${workspaceName} home`}>
          <SpotMark size={36} />
          <span className="truncate text-[15px] font-medium tracking-[-0.01em] lg:inline md:hidden">{workspaceName}</span>
        </Link>

        <nav aria-label="Main" className="mx-auto hidden items-center gap-1 rounded-full bg-elevated p-1.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center rounded-full px-4 text-[14px] transition-colors duration-150",
                  active ? "bg-accent text-on-accent" : "text-fg-2 hover:bg-hover hover:text-fg",
                )}
              >
                {item.label}
                {item.href === "/" && urgent > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-medium text-on-chunk">
                    {urgent}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <CircleButton label="Search (⌘K)" tone="surface" size={44} onClick={openSearch}>
            <Search />
          </CircleButton>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

/** Mobile: a floating dark dock with the six destinations. */
export function MobileDock() {
  const { isActive, urgent } = useNavState();
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="flex items-center gap-1 rounded-full bg-ink p-1.5 text-on-ink shadow-menu">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon]!;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex size-12 items-center justify-center rounded-full transition-colors",
                active ? "bg-[var(--on-ink)] text-[var(--c-ink)]" : "text-[var(--on-ink-2)] hover:text-[var(--on-ink)]",
              )}
            >
              <Icon className="size-5" strokeWidth={1.8} />
              {item.href === "/" && urgent > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-coral" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { data, me, signOut, mode } = useWorkspace();
  const { pref, setPref } = useTheme();
  const { setAnchor, ...menu } = usePopover<HTMLButtonElement>();
  const demo = getDemoAdapter();
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={menu.toggle}
        aria-label="Account and settings"
        className="relative flex size-11 items-center justify-center rounded-full bg-elevated transition-transform active:scale-95"
      >
        <Avatar profile={me} size={36} />
        {mode === "demo" && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-bg bg-sun" title="Demo mode" />}
      </button>
      <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={270}>
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <Avatar profile={me} size={40} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium">{me?.full_name ?? "—"}</div>
            <div className="truncate text-[12px] text-fg-2">{me?.email}</div>
          </div>
        </div>
        <MenuDivider />
        <MenuList>
          <MenuLabel>Look</MenuLabel>
          <div className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-full bg-hover p-1">
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
                  "flex h-8 items-center justify-center gap-1.5 rounded-full text-[12.5px] transition-colors",
                  pref === value ? "bg-elevated text-fg shadow-card" : "text-fg-2 hover:text-fg",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          {demo && (
            <>
              <MenuDivider />
              <MenuLabel>Demo — view as</MenuLabel>
              {data.profiles.map((p) => (
                <MenuItem
                  key={p.id}
                  icon={<Avatar profile={p} size={18} />}
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
          <MenuItem
            icon={<Settings className="size-4" />}
            onSelect={() => {
              menu.close();
              router.push("/settings");
            }}
          >
            Settings
          </MenuItem>
          <MenuItem
            icon={<Users className="size-4" />}
            onSelect={() => {
              menu.close();
              router.push("/settings?section=workspace");
            }}
          >
            Members
          </MenuItem>
          <MenuItem icon={<LogOut className="size-4" />} onSelect={() => void signOut()}>
            Log out
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}
