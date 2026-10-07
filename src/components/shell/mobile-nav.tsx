"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuList } from "@/components/ui/menu";
import { NAV_ART, Wordmark } from "./icons";
import { isActivePath, useNavBadge } from "./sidebar";
import { StatBar } from "./stat-bar";

const PRIMARY = ["/", "/calendar", "/projects", "/library"];

/** Phone header: wordmark + the same glanceable chips. */
export function MobileTopBar() {
  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-2 border-b-2 border-line bg-bg px-3 md:hidden">
      <Link href="/" aria-label="Spot OS home" className="shrink-0">
        <Wordmark className="text-[24px] leading-none" />
      </Link>
      <StatBar className="min-w-0 flex-1 justify-end" showAccount />
    </header>
  );
}

/** Phone bottom tab bar (Duolingo mobile web). */
export function MobileTabBar() {
  const pathname = usePathname();
  const badge = useNavBadge();
  const { setAnchor, ...more } = usePopover<HTMLButtonElement>();
  const secondary = NAV_ITEMS.filter((n) => !PRIMARY.includes(n.href));
  const moreActive = secondary.some((n) => isActivePath(pathname, n.href));
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-stretch justify-around border-t-2 border-line bg-bg px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      {NAV_ITEMS.filter((n) => PRIMARY.includes(n.href)).map((n) => {
        const Art = NAV_ART[n.icon]!;
        const active = isActivePath(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-label={n.label}
            aria-current={active ? "page" : undefined}
            className={cn("relative my-2 flex w-16 items-center justify-center rounded-xl border-2", active ? "border-line-selected bg-selected" : "border-transparent")}
          >
            <Art size={32} />
            {n.href === "/" && badge > 0 && (
              <span className="absolute right-2 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[11px] font-extrabold text-white">{badge}</span>
            )}
          </Link>
        );
      })}
      <button
        ref={setAnchor}
        type="button"
        onClick={more.toggle}
        aria-label="More"
        className={cn("my-2 flex w-16 items-center justify-center rounded-xl border-2", moreActive || more.open ? "border-line-selected bg-selected" : "border-transparent")}
      >
        <NAV_ART.more size={32} />
      </button>
      <Popover open={more.open} onClose={more.close} anchor={more.anchor} align="end" width={240}>
        <MenuList>
          {[...secondary, { href: "/settings", label: "Settings", icon: "more" }].map((n) => {
            const Art = NAV_ART[n.icon]!;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={more.close}
                className={cn(
                  "label-caps flex h-12 items-center gap-3 rounded-xl px-2.5 text-[13px]",
                  isActivePath(pathname, n.href) ? "bg-selected text-blue" : "text-fg-2 hover:bg-hover",
                )}
              >
                <Art size={28} />
                {n.label}
              </Link>
            );
          })}
        </MenuList>
      </Popover>
    </nav>
  );
}
