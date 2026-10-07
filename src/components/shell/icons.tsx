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

/** Studio Spot mark — a coral spot with a cream dot. */
export function SpotMark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-coral"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute rounded-full bg-[#f7f3ea]" style={{ width: size * 0.3, height: size * 0.3, top: size * 0.24, right: size * 0.24 }} />
    </span>
  );
}
