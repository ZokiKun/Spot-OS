import type { ReactNode } from "react";
import { cn } from "@/directions/d3/lib/utils";

export type BannerTone = "green" | "blue" | "orange" | "red" | "purple" | "gray";

const TONE: Record<BannerTone, string> = {
  green: "bg-green border-green-edge",
  blue: "bg-blue border-blue-edge",
  orange: "bg-orange border-orange-edge",
  red: "bg-red border-red-edge",
  purple: "bg-purple border-purple-edge",
  gray: "bg-[#9a9a9a] border-[#7d7d7d] dark:bg-[#52656d] dark:border-[#37464f]",
};

/**
 * The coloured header card (Duolingo "SECTION 2, UNIT 1 · Ask for directions").
 * Colour carries meaning — the page's state is readable before any text.
 */
export function Banner({
  tone = "green",
  overline,
  title,
  children,
  action,
  art,
  className,
}: {
  tone?: BannerTone;
  overline?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  art?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border-b-[5px] text-white", TONE[tone], className)}>
      <div className="flex items-center gap-4 px-6 py-5 sm:px-7 sm:py-6">
        <div className="min-w-0 flex-1">
          {overline && <div className="label-caps mb-1 text-[12.5px] text-white/80">{overline}</div>}
          <div className="text-[24px] font-black leading-tight sm:text-[28px]">{title}</div>
          {children && <div className="mt-2 text-[15.5px] font-bold leading-snug text-white/90">{children}</div>}
          {action && <div className="mt-4 flex flex-wrap gap-2.5">{action}</div>}
        </div>
        {art && <div className="flex size-[124px] shrink-0 items-center justify-center rounded-full bg-white/20 max-[460px]:hidden">{art}</div>}
      </div>
    </div>
  );
}

/** Outlined white button that sits on a banner (Duolingo "GUIDEBOOK"). */
export const bannerButton =
  "press label-caps inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-white/45 px-4 text-[13px] text-white transition-colors hover:bg-white/15 [--press-depth:2px]";
