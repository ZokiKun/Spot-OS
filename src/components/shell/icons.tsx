import {
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  House,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const NAV_ICONS: Record<string, LucideIcon> = {
  home: House,
  calendar: CalendarDays,
  projects: FolderKanban,
  library: Library,
  reviews: ClipboardCheck,
  activity: Activity,
  spotbase: BookOpen,
  settings: Settings,
};

/** Studio Spot mark — an orange spot. */
export function SpotMark({ size = 20 }: { size?: number }) {
  // The Studio Spot logo, painted in currentColor via a mask so it follows light/dark mode.
  const mask = "url(/logo.png) center / contain no-repeat";
  return (
    <span
      className="inline-block shrink-0 bg-current text-fg"
      style={{ width: size, height: size, mask, WebkitMask: mask }}
      aria-hidden
    />
  );
}
