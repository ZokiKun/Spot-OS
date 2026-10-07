import {
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
  spotbase: BookOpen,
  settings: Settings,
};

/** Studio Spot mark — an orange spot. */
export function SpotMark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] bg-[#e16f24] text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="rounded-full bg-white" style={{ width: size * 0.36, height: size * 0.36 }} />
    </span>
  );
}
