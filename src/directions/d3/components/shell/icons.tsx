import {
  BookOpen,
  CalendarDays,
  ChartColumnBig,
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
  studio: ChartColumnBig,
  library: Library,
  reviews: ClipboardCheck,
  spotbase: BookOpen,
  settings: Settings,
};

type ArtProps = { size?: number; className?: string };

/** Flat, colourful nav illustrations (Duolingo sidebar style). 32×32 grid, darker bottom edges. */
export const NAV_ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  home: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="6" y="14" width="20" height="14" rx="3" fill="#ffc800" />
      <rect x="6" y="24" width="20" height="4" rx="2" fill="#e5b400" />
      <path d="M3.5 15.5 L16 5 L28.5 15.5" fill="none" stroke="#ff4b4b" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="18" width="6" height="10" rx="2" fill="#a5653a" />
    </svg>
  ),
  calendar: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="4" y="6" width="24" height="23" rx="5" fill="#e5e5e5" />
      <rect x="4" y="6" width="24" height="21" rx="5" fill="#fff" stroke="#e5e5e5" strokeWidth="1.5" />
      <path d="M4 11 a5 5 0 0 1 5 -5 h14 a5 5 0 0 1 5 5 v2 H4 Z" fill="#ff4b4b" />
      <rect x="9" y="3" width="3" height="7" rx="1.5" fill="#777" />
      <rect x="20" y="3" width="3" height="7" rx="1.5" fill="#777" />
      <rect x="8.5" y="16" width="4" height="4" rx="1.2" fill="#1cb0f6" />
      <rect x="14" y="16" width="4" height="4" rx="1.2" fill="#ffc800" />
      <rect x="19.5" y="16" width="4" height="4" rx="1.2" fill="#e5e5e5" />
      <rect x="8.5" y="21.5" width="4" height="4" rx="1.2" fill="#e5e5e5" />
      <rect x="14" y="21.5" width="4" height="4" rx="1.2" fill="#58cc02" />
    </svg>
  ),
  projects: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <path d="M3 9 a3 3 0 0 1 3 -3 h7 l3 3 h10 a3 3 0 0 1 3 3 v13 a3 3 0 0 1 -3 3 H6 a3 3 0 0 1 -3 -3 Z" fill="#e5b400" />
      <rect x="6" y="9" width="20" height="9" rx="2" fill="#fff" />
      <path d="M3 14 a3 3 0 0 1 3 -3 h20 a3 3 0 0 1 3 3 v11 a3 3 0 0 1 -3 3 H6 a3 3 0 0 1 -3 -3 Z" fill="#ffc800" />
      <rect x="3" y="24" width="26" height="4" rx="2" fill="#e5b400" />
    </svg>
  ),
  studio: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="4" y="15" width="7" height="13" rx="3" fill="#1cb0f6" />
      <rect x="4" y="25" width="7" height="3" rx="1.5" fill="#1899d6" />
      <rect x="12.5" y="8" width="7" height="20" rx="3" fill="#58cc02" />
      <rect x="12.5" y="25" width="7" height="3" rx="1.5" fill="#58a700" />
      <rect x="21" y="4" width="7" height="24" rx="3" fill="#ce82ff" />
      <rect x="21" y="25" width="7" height="3" rx="1.5" fill="#a568cc" />
    </svg>
  ),
  library: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="4" y="6" width="7" height="22" rx="2.5" fill="#1cb0f6" />
      <rect x="4" y="10" width="7" height="2.5" fill="#fff" opacity="0.7" />
      <rect x="12.5" y="9" width="7" height="19" rx="2.5" fill="#ce82ff" />
      <rect x="12.5" y="13" width="7" height="2.5" fill="#fff" opacity="0.7" />
      <rect x="20" y="8" width="7" height="20" rx="2.5" fill="#ff9600" transform="rotate(12 23.5 18)" />
      <rect x="2" y="26.5" width="28" height="3" rx="1.5" fill="#a5653a" />
    </svg>
  ),
  reviews: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="5" y="5" width="22" height="25" rx="4" fill="#a5653a" />
      <rect x="5" y="5" width="22" height="23" rx="4" fill="#c4834f" />
      <rect x="8" y="9" width="16" height="17" rx="2.5" fill="#fff" />
      <rect x="11" y="3" width="10" height="6" rx="2" fill="#777" />
      <path d="M11 17.5 L14.5 21 L21 13.5" fill="none" stroke="#58cc02" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spotbase: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect x="6" y="5" width="21" height="24" rx="4" fill="#58a700" />
      <rect x="9" y="24" width="18" height="5" rx="2" fill="#fff" />
      <rect x="5" y="4" width="21" height="22" rx="4" fill="#58cc02" />
      <circle cx="15.5" cy="14" r="5" fill="#ff9600" />
      <circle cx="14" cy="12.5" r="1.6" fill="#fff" opacity="0.6" />
    </svg>
  ),
  more: ({ size = 32, className }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <circle cx="16" cy="17" r="13" fill="#a568cc" />
      <circle cx="16" cy="16" r="13" fill="#ce82ff" />
      <circle cx="10" cy="16" r="2.2" fill="#fff" />
      <circle cx="16" cy="16" r="2.2" fill="#fff" />
      <circle cx="22" cy="16" r="2.2" fill="#fff" />
    </svg>
  ),
};

/** Studio Spot mark — an orange spot. */
export function SpotMark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-orange shadow-[0_2px_0_var(--orange-edge)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="rounded-full bg-white" style={{ width: size * 0.34, height: size * 0.34 }} />
    </span>
  );
}

/** "spot os" wordmark — lowercase, heavy, rounded (like the duolingo wordmark). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
      <span className="text-brand">spot</span>
      <span className="text-green"> os</span>
    </span>
  );
}
