"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, LogOut, Monitor, Moon, Palette, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Sparkles, Sun, Users } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { isActiveProject, isMyProject, sortProjects } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { usePref } from "@/lib/hooks";
import { getDemoAdapter } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuLabel, MenuList } from "@/components/ui/menu";
import { Kbd } from "@/components/ui/misc";
import { NAV_ICONS, SpotMark } from "./icons";
import { useShell } from "./shell-context";
import { useTheme } from "./theme";
import { InboxButton } from "./inbox";
import { openWhatsNew, useHasUnseenRelease } from "./whats-new";
import { ProjectIcon } from "@/components/ui/project-icon";

/** Icon-only sidebar (desktop): rows show just their icon, with the name as a tooltip. */
const CollapsedContext = createContext(false);
export const SIDEBAR_COLLAPSED_PREF = "sidebar-collapsed";

/** Opens the "What's new" screen; a dot while there's a release this device hasn't seen. */
function WhatsNewRow({ onOpen }: { onOpen?: () => void }) {
  const collapsed = useContext(CollapsedContext);
  const unseen = useHasUnseenRelease();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openWhatsNew();
      }}
      title={collapsed ? "What’s new" : undefined}
      aria-label={collapsed ? "What’s new" : undefined}
      className={cn("flex h-[30px] w-full items-center gap-2 rounded-md text-[14px] text-fg-2 transition-colors duration-75 hover:bg-hover", collapsed ? "justify-center" : "px-2")}
    >
      <span className="relative flex size-[22px] shrink-0 items-center justify-center">
        <Sparkles className="size-[17px]" strokeWidth={1.8} />
        {unseen && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent" />}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">What’s new</span>}
    </button>
  );
}

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
  const collapsed = useContext(CollapsedContext);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      draggable={false}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group flex h-[30px] items-center gap-2 rounded-md text-[14px] transition-colors duration-75",
        collapsed ? "justify-center" : "px-2",
        active ? "bg-active font-medium text-fg" : "text-fg-2 hover:bg-hover",
      )}
    >
      <span className={cn("relative flex size-[22px] shrink-0 items-center justify-center", active ? "text-fg" : "text-fg-2")}>
        {icon}
        {collapsed && badge != null && badge > 0 && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--dot-red)]" />}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="rounded-full bg-[var(--dot-red)] px-1.5 text-[11px] font-medium leading-4 text-white">{badge}</span>
      )}
    </Link>
  );
}

/** The sidebar's top buttons, in the default order. Each person can drag them into their own order. */
const TOP_ITEMS = ["search", "inbox", ...NAV_ITEMS.map((i) => i.href)];
const ORDER_PREF = "sidebar-order";

function useTopOrder() {
  const [saved, setSaved] = usePref<string[] | null>(ORDER_PREF, null);
  // Keep known items only, and append any added since the order was saved.
  const order = useMemo(() => {
    const known = (saved ?? []).filter((k) => TOP_ITEMS.includes(k));
    return [...known, ...TOP_ITEMS.filter((k) => !known.includes(k))];
  }, [saved]);
  return { order, custom: saved != null, save: setSaved, reset: () => setSaved(undefined) };
}

type ProjectScope = "mine" | "everyone";
const SCOPE_PREF = "sidebar-projects-scope";
const projectOrderPref = (meId: string | null) => `sidebar-project-order:${meId ?? "anon"}`;

/**
 * The sidebar's active projects. "Only you": the ones you're on, in the order you dragged them into
 * (saved per person on this device; newly joined projects join at the end). "Everyone": all of them, by status then deadline.
 */
function useSidebarProjects() {
  const { data, me } = useWorkspace();
  const meId = me?.id ?? null;
  const [scope, setScope] = usePref<ProjectScope>(SCOPE_PREF, "mine");
  const [saved, setSaved] = usePref<string[] | null>(projectOrderPref(meId), null);
  const projects = useMemo(() => {
    const active = sortProjects(data.projects.filter(isActiveProject));
    if (scope === "everyone") return active;
    const mine = active.filter((p) => isMyProject(p, data, meId));
    const byId = new Map(mine.map((p) => [p.id, p]));
    const kept = (saved ?? []).filter((id) => byId.has(id));
    return [...kept.map((id) => byId.get(id)!), ...mine.filter((p) => !kept.includes(p.id))];
  }, [data, meId, scope, saved]);
  return {
    scope,
    setScope,
    projects,
    custom: saved != null,
    reorder: (ids: string[]) => setSaved(ids),
    reset: () => setSaved(undefined),
  };
}

/** Drag-to-reorder list of sidebar rows; the moved row shows where it will land. */
function Reorderable({ order, onReorder, render }: { order: string[]; onReorder: (next: string[]) => void; render: (key: string) => ReactNode }) {
  const [drag, setDrag] = useState<{ key: string; over: string | null; after: boolean } | null>(null);
  const drop = () => {
    if (drag?.over && drag.over !== drag.key) {
      const next = order.filter((k) => k !== drag.key);
      const at = next.indexOf(drag.over) + (drag.after ? 1 : 0);
      next.splice(at, 0, drag.key);
      onReorder(next);
    }
    setDrag(null);
  };
  return (
    <>
      {order.map((key) => (
        <div
          key={key}
          draggable
          title="Drag to reorder"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", key);
            setDrag({ key, over: null, after: false });
          }}
          onDragOver={(e) => {
            if (!drag) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            const after = e.clientY > r.top + r.height / 2;
            if (drag.over !== key || drag.after !== after) setDrag({ ...drag, over: key, after });
          }}
          onDrop={(e) => {
            e.preventDefault();
            drop();
          }}
          onDragEnd={() => setDrag(null)}
          className={cn(
            "relative cursor-grab active:cursor-grabbing",
            drag?.key === key && "opacity-40",
            drag?.over === key && drag.key !== key && (drag.after
              ? "after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
              : "before:absolute before:inset-x-1 before:-top-px before:h-0.5 before:rounded-full before:bg-accent"),
          )}
        >
          {render(key)}
        </div>
      ))}
    </>
  );
}

/**
 * The app sidebar. `collapsed` (desktop only) shrinks it to an icon rail; `onToggleCollapse`
 * shows the collapse/expand button (⌘\ does the same).
 */
export function Sidebar({ collapsed = false, onToggleCollapse }: { collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, me, mode, signOut, status, canEdit } = useWorkspace();
  const { openSearch, closeMobileNav } = useShell();
  const { pref, setPref } = useTheme();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover<HTMLButtonElement>();
  const workspaceName = (data.settings.find((s) => s.key === "workspace")?.value.name as string) ?? "Studio Spot";

  const top = useTopOrder();
  const sidebarProjects = useSidebarProjects();
  const activeProjects = sidebarProjects.projects;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/library" && pathname.startsWith("/spot-base")); // Spot Base lives in Library
  const demo = getDemoAdapter();

  return (
    <CollapsedContext value={collapsed}>
    <nav className="flex h-full w-full flex-col bg-sidebar text-fg" aria-label="Main">
      {/* Workspace switcher */}
      <div className={cn("pt-2", collapsed ? "flex flex-col items-center gap-1 px-1.5" : "group/ws flex items-center gap-0.5 px-2")}>
        <button
          ref={menuAnchorRef}
          type="button"
          onClick={menu.toggle}
          title={collapsed ? workspaceName : undefined}
          className={cn("flex h-9 items-center gap-2 rounded-md text-left hover:bg-hover", collapsed ? "w-9 justify-center" : "min-w-0 flex-1 px-2")}
        >
          <SpotMark size={24} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{workspaceName}</span>
              {!canEdit && <span className="shrink-0 rounded-[3px] bg-active px-1.5 text-[11px] text-fg-2">View only</span>}
              <ChevronDown className="size-3.5 text-fg-3" />
            </>
          )}
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar (Shift+S or ⌘\\)" : "Collapse sidebar (Shift+S or ⌘\\)"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg-2",
              !collapsed && "opacity-0 focus-visible:opacity-100 group-hover/ws:opacity-100",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
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
            <MenuItem
              icon={<Palette className="size-4" />}
              onSelect={() => {
                menu.close();
                router.push("/settings?section=appearance");
              }}
            >
              Colour theme…
            </MenuItem>
            {(top.custom || sidebarProjects.custom) && (
              <MenuItem
                icon={<RotateCcw className="size-4" />}
                onSelect={() => {
                  top.reset();
                  sidebarProjects.reset();
                  menu.close();
                }}
              >
                Reset sidebar order
              </MenuItem>
            )}
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

      <div className={cn("pt-1", collapsed ? "px-1.5" : "px-2")}>
        <Reorderable
          order={top.order}
          onReorder={top.save}
          render={(key) => {
            if (key === "search")
              return (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileNav();
                    openSearch();
                  }}
                  title={collapsed ? "Search (⌘K)" : undefined}
                  aria-label={collapsed ? "Search" : undefined}
                  className={cn("flex h-[30px] w-full items-center gap-2 rounded-md text-[14px] text-fg-2 hover:bg-hover", collapsed ? "justify-center" : "px-2")}
                >
                  <span className="flex size-[22px] items-center justify-center">
                    <Search className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Search</span>
                      <Kbd>⌘K</Kbd>
                    </>
                  )}
                </button>
              );
            if (key === "inbox") return <InboxButton onNavigate={closeMobileNav} compact={collapsed} />;
            const item = NAV_ITEMS.find((i) => i.href === key)!;
            const Icon = NAV_ICONS[item.icon]!;
            return (
              <NavRow
                href={item.href}
                label={item.label}
                icon={<Icon className="size-[18px]" strokeWidth={1.8} />}
                active={isActive(item.href)}
                onNavigate={closeMobileNav}
              />
            );
          }}
        />
      </div>

      <div className={cn("mt-5 min-h-0 flex-1 overflow-y-auto", collapsed ? "px-1.5" : "px-2")}>
        {collapsed ? (
          <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
        ) : (
        <div className="mb-0.5 flex h-6 items-center gap-2 pl-2 pr-1">
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg-2">Active projects</span>
          <div role="radiogroup" aria-label="Which projects" className="flex shrink-0 rounded-md bg-hover p-px">
            {(
              [
                ["mine", "Only you"],
                ["everyone", "Everyone"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={sidebarProjects.scope === value}
                onClick={() => sidebarProjects.setScope(value)}
                className={cn(
                  "h-5 rounded-[5px] px-1.5 text-[11px] transition-colors",
                  sidebarProjects.scope === value ? "bg-bg font-medium text-fg shadow-sm" : "text-fg-3 hover:text-fg-2",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        )}
        {status === "loading" && !collapsed && <div className="px-2 py-1 text-[13px] text-fg-3">Loading…</div>}
        {(() => {
          const row = (id: string) => {
            const p = activeProjects.find((x) => x.id === id)!;
            return (
              <NavRow
                href={`/projects/${p.id}`}
                label={p.name}
                icon={<span className="text-[15px] leading-none"><ProjectIcon icon={p.icon} /></span>}
                active={pathname === `/projects/${p.id}`}
                onNavigate={closeMobileNav}
              />
            );
          };
          const ids = activeProjects.map((p) => p.id);
          // Only your own list is hand-ordered; Everyone stays by status and deadline.
          return sidebarProjects.scope === "mine" ? (
            <Reorderable order={ids} onReorder={sidebarProjects.reorder} render={row} />
          ) : (
            ids.map((id) => <div key={id}>{row(id)}</div>)
          );
        })()}
        {status === "ready" && !collapsed && activeProjects.length === 0 && (
          <div className="px-2 py-1 text-[13px] text-fg-3">{sidebarProjects.scope === "mine" ? "You’re not on any active project" : "No active projects"}</div>
        )}
      </div>

      <div className={cn("border-t border-line py-2", collapsed ? "px-1.5" : "px-2")}>
        <WhatsNewRow onOpen={closeMobileNav} />
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
            title={collapsed ? "Demo mode — local data only" : undefined}
            className={cn("mt-1 flex items-center gap-2 rounded-md py-1.5 text-[12px] text-fg-2 hover:bg-hover", collapsed ? "justify-center" : "px-2")}
          >
            <span className="size-1.5 rounded-full bg-[var(--dot-orange)]" />
            {!collapsed && "Demo mode — local data only"}
          </Link>
        )}
      </div>
    </nav>
    </CollapsedContext>
  );
}
