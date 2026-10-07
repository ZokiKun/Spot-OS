"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ChevronDown, LogOut, Monitor, Moon, Search, Sun, Users } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, sortProjects } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { getDemoAdapter } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { Kbd } from "@/components/ui/misc";
import { NAV_ICONS, SpotMark } from "./icons";
import { useShell } from "./shell-context";
import { useTheme } from "./theme";

function NavRow({
  href,
  icon,
  label,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex h-[30px] items-center gap-2 rounded-md px-2 text-[14px] transition-colors duration-75",
        active ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
      )}
    >
      <span className={cn("flex size-[22px] shrink-0 items-center justify-center", active ? "text-fg" : "text-fg-2")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-[var(--dot-red)] px-1.5 text-[11px] font-medium leading-4 text-white">{badge}</span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, me, mode, signOut, status } = useWorkspace();
  const { openSearch, closeMobileNav } = useShell();
  const { pref, setPref } = useTheme();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover<HTMLButtonElement>();
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";

  const activeProjects = useMemo(() => sortProjects(data.projects.filter(isActiveProject)), [data.projects]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const demo = getDemoAdapter();

  return (
    <nav className="flex h-full w-full flex-col bg-sidebar text-fg" aria-label="Main">
      {/* Workspace switcher */}
      <div className="px-2 pt-2">
        <button
          ref={menuAnchorRef}
          type="button"
          onClick={menu.toggle}
          className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-hover"
        >
          <SpotMark size={22} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{workspaceName}</span>
          <ChevronDown className="size-3.5 text-fg-3" />
        </button>
        <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} width={260}>
          <div className="flex items-center gap-2.5 px-3 pb-2 pt-3">
            <Avatar profile={me} size={32} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium">{me?.full_name ?? "—"}</div>
              <div className="truncate text-[12px] text-fg-2">{me?.email}</div>
            </div>
          </div>
          <MenuDivider />
          <MenuList>
            <MenuLabel>Theme</MenuLabel>
            <MenuItem icon={<Monitor className="size-4" />} selected={pref === "system"} onSelect={() => setPref("system")}>
              Use system setting
            </MenuItem>
            <MenuItem icon={<Sun className="size-4" />} selected={pref === "light"} onSelect={() => setPref("light")}>
              Light
            </MenuItem>
            <MenuItem icon={<Moon className="size-4" />} selected={pref === "dark"} onSelect={() => setPref("dark")}>
              Dark
            </MenuItem>
            {demo && (
              <>
                <MenuDivider />
                <MenuLabel>Demo — switch member</MenuLabel>
                {data.profiles.map((p) => (
                  <MenuItem
                    key={p.id}
                    icon={<Avatar profile={p} size={16} />}
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
      </div>

      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => {
            closeMobileNav();
            openSearch();
          }}
          className="flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[14px] text-fg-2 hover:bg-hover"
        >
          <span className="flex size-[22px] items-center justify-center">
            <Search className="size-[18px]" strokeWidth={1.8} />
          </span>
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon]!;
          return (
            <NavRow
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<Icon className="size-[18px]" strokeWidth={1.8} />}
              active={isActive(item.href)}
              onNavigate={closeMobileNav}
            />
          );
        })}
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
        <div className="mb-0.5 flex h-6 items-center px-2 text-[12px] font-medium text-fg-2">Active projects</div>
        {status === "loading" && <div className="px-2 py-1 text-[13px] text-fg-3">Loading…</div>}
        {activeProjects.map((p) => (
          <NavRow
            key={p.id}
            href={`/projects/${p.id}`}
            label={p.name}
            icon={<span className="text-[15px] leading-none">{p.icon ?? "📁"}</span>}
            active={pathname === `/projects/${p.id}`}
            onNavigate={closeMobileNav}
          />
        ))}
        {status === "ready" && activeProjects.length === 0 && (
          <div className="px-2 py-1 text-[13px] text-fg-3">No active projects</div>
        )}
      </div>

      <div className="border-t border-line px-2 py-2">
        <NavRow
          href="/settings"
          label="Settings"
          icon={<NAV_ICONS.settings className="size-[18px]" strokeWidth={1.8} />}
          active={isActive("/settings")}
          onNavigate={closeMobileNav}
        />
        {mode === "demo" && (
          <Link
            href="/settings?section=data"
            onClick={closeMobileNav}
            className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-fg-2 hover:bg-hover"
          >
            <span className="size-1.5 rounded-full bg-[var(--dot-orange)]" />
            Demo mode — local data only
          </Link>
        )}
      </div>
    </nav>
  );
}
