import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mascot, type Mood } from "./mascot";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  mood,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Show the mascot instead of an icon. */
  mood?: Mood;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {mood ? <Mascot mood={mood} size={72} className="mb-3" /> : icon && <div className="mb-3 text-fg-3">{icon}</div>}
      <div className="text-[16px] font-extrabold text-fg">{title}</div>
      {description && <div className="mt-1 max-w-sm text-[14px] font-semibold text-fg-2">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-hover", className)} />;
}

/** Bold section heading with an optional blue uppercase action on the right ("Daily Quests · VIEW ALL"). */
export function SectionHeading({
  children,
  action,
  className,
  size = "lg",
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-2", className)}>
      <h2 className={cn("min-w-0 flex-1 truncate font-extrabold text-fg", size === "lg" ? "text-[22px]" : "text-[17px]")}>{children}</h2>
      {action && <span className="flex shrink-0 items-center">{action}</span>}
    </div>
  );
}

/** Blue uppercase text link ("VIEW ALL"). */
export function ActionLink({ href, onClick, children, className }: { href?: string; onClick?: () => void; children: ReactNode; className?: string }) {
  const cls = cn("label-caps rounded-lg px-1 text-[13px] text-blue transition-colors hover:text-blue-edge", className);
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** White card with the Duolingo 2px light-grey outline. */
export function Card({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  return <As className={cn("rounded-2xl border-2 border-line bg-bg", className)}>{children}</As>;
}

export type Tone = "green" | "blue" | "orange" | "red" | "yellow" | "purple" | "gray";

const TILE: Record<Tone, string> = {
  green: "bg-green-soft text-green-edge",
  blue: "bg-blue-soft text-blue-edge",
  orange: "bg-orange-soft text-orange-edge",
  red: "bg-red-soft text-red-edge",
  yellow: "bg-yellow-soft text-yellow-edge",
  purple: "bg-purple-soft text-purple-edge",
  gray: "bg-hover text-fg-2",
};

/** Rounded square holding an icon or emoji, tinted by meaning. */
export function IconTile({ tone = "gray", size = 44, children, className }: { tone?: Tone; size?: number; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-2xl", TILE[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {children}
    </span>
  );
}

const FILL: Record<string, string> = {
  yellow: "bg-yellow",
  green: "bg-green",
  blue: "bg-blue",
  red: "bg-red",
  orange: "bg-orange",
  purple: "bg-purple",
  default: "bg-blue",
};

/** Thick, rounded progress bar with a glossy highlight (Duolingo quests). */
export function ProgressBar({
  value,
  className,
  tone = "default",
  label,
  size = "md",
}: {
  value: number;
  className?: string;
  tone?: "default" | "green" | "red" | "yellow" | "blue" | "orange" | "purple";
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const h = size === "sm" ? "h-2.5" : size === "lg" ? "h-5" : "h-4";
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full bg-active", h, className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("relative h-full rounded-full transition-[width] duration-500 ease-out", FILL[tone])} style={{ width: `${pct}%`, minWidth: pct > 0 ? (size === "sm" ? 10 : 16) : 0 }}>
        {size !== "sm" && pct > 6 && <span className="absolute inset-x-2 top-[3px] h-[4px] rounded-full bg-white/35" />}
      </div>
      {label != null && (
        <span className={cn("absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular", pct >= 50 ? "text-[#4b4b4b]/80" : "text-fg-2")}>{label}</span>
      )}
    </div>
  );
}

export function Callout({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl border-2 border-line bg-subtle px-4 py-3.5 text-[14px]", className)}>
      {icon && <div className="shrink-0 text-[18px] leading-[22px]">{icon}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border-2 border-b-[3px] border-line px-1.5 font-sans text-[11px] font-extrabold text-fg-3">{children}</kbd>;
}

/** Small calendar-page tile for a date (month over day). */
export function DateTile({ date, tone = "gray" }: { date: Date; tone?: "gray" | "red" | "orange" }) {
  const top = tone === "red" ? "bg-red" : tone === "orange" ? "bg-orange" : "bg-fg-3";
  return (
    <span className="inline-flex w-11 shrink-0 flex-col overflow-hidden rounded-xl border-2 border-line bg-bg text-center">
      <span className={cn("label-caps py-px text-[9px] leading-[14px] text-white", top)}>
        {date.toLocaleString("en", { month: "short" })}
      </span>
      <span className="py-0.5 text-[17px] font-black leading-[22px] text-fg tabular">{date.getDate()}</span>
    </span>
  );
}
