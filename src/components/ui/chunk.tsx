"use client";

/*
  Direction 2 building blocks. Information is shown in "chunks": big rounded cards
  that each answer one question, show at most a few items, and open into detail.
*/

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "coral" | "sun" | "lime" | "sky" | "cream" | "lilac" | "pink" | "ink" | "surface";

/** Card fill + text colour. Colour cards always use dark text, ink flips with the theme. */
export const TONE: Record<Tone, string> = {
  coral: "bg-coral text-on-chunk [--check-stroke:#f7f3ea]",
  sun: "bg-sun text-on-chunk [--check-stroke:#f7f3ea]",
  lime: "bg-lime text-on-chunk [--check-stroke:#f7f3ea]",
  sky: "bg-sky text-on-chunk [--check-stroke:#f7f3ea]",
  cream: "bg-cream text-on-chunk [--check-stroke:#f7f3ea]",
  lilac: "bg-lilac text-on-chunk [--check-stroke:#f7f3ea]",
  pink: "bg-[var(--c-pink)] text-on-chunk [--check-stroke:#f7f3ea]",
  ink: "bg-ink text-on-ink [--check-stroke:#151515]",
  surface: "bg-elevated text-fg",
};

/** Muted text that works on the given tone. */
export const MUTED: Record<Tone, string> = {
  coral: "text-[var(--on-chunk-2)]",
  sun: "text-[var(--on-chunk-2)]",
  lime: "text-[var(--on-chunk-2)]",
  sky: "text-[var(--on-chunk-2)]",
  cream: "text-[var(--on-chunk-2)]",
  lilac: "text-[var(--on-chunk-2)]",
  pink: "text-[var(--on-chunk-2)]",
  ink: "text-[var(--on-ink-2)]",
  surface: "text-fg-2",
};

/** Soft fill for rows / chips sitting on a card of this tone. */
export const SOFT: Record<Tone, string> = {
  coral: "bg-[var(--chunk-soft)]",
  sun: "bg-[var(--chunk-soft)]",
  lime: "bg-[var(--chunk-soft)]",
  sky: "bg-[var(--chunk-soft)]",
  cream: "bg-[var(--chunk-soft)]",
  lilac: "bg-[var(--chunk-soft)]",
  pink: "bg-[var(--chunk-soft)]",
  ink: "bg-white/10",
  surface: "bg-hover",
};

export const isColor = (t: Tone) => t !== "ink" && t !== "surface";

const RADIUS = "rounded-[28px]";

/** A chunk: a big rounded card. Use `href` to make the whole card a link. */
export function Card({
  tone = "surface",
  href,
  onClick,
  className,
  children,
  handle = false,
  external,
}: {
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
  /** Small grab-handle lines at the top — a decorative "this is a card" cue. */
  handle?: boolean;
  external?: boolean;
}) {
  const cls = cn(
    "relative flex min-w-0 flex-col p-5",
    RADIUS,
    TONE[tone],
    (href || onClick) && "press cursor-pointer text-left",
    className,
  );
  const inner = (
    <>
      {handle && <Handle />}
      {children}
    </>
  );
  if (href)
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}

export function Handle({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute left-1/2 top-2.5 flex -translate-x-1/2 flex-col gap-[3px]", className)}>
      <span className="h-[2px] w-7 rounded-full bg-current opacity-20" />
      <span className="h-[2px] w-7 rounded-full bg-current opacity-20" />
    </span>
  );
}

type CircleTone = "ink" | "black" | "soft" | "surface" | "ghost" | "outline";
const CIRCLE: Record<CircleTone, string> = {
  ink: "bg-accent text-on-accent hover:bg-accent-hover",
  /** Always black — for the primary action sitting on a colour card, in either theme. */
  black: "bg-[#151515] text-[#f7f3ea] hover:bg-[#2e2d2b]",
  soft: "bg-[var(--chunk-soft)] text-current hover:bg-[var(--chunk-soft-2)]",
  surface: "bg-elevated text-fg hover:bg-[color-mix(in_srgb,var(--bg-elevated)_88%,var(--text))]",
  ghost: "text-current hover:bg-hover",
  outline: "text-current shadow-[inset_0_0_0_1.5px_currentColor] opacity-80 hover:opacity-100",
};

export const circleClass = (tone: CircleTone = "surface", size = 40) =>
  cn(
    "inline-flex shrink-0 select-none items-center justify-center rounded-full transition-[background,transform,opacity] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    CIRCLE[tone],
    size >= 52 ? "[&_svg]:size-6" : size >= 40 ? "[&_svg]:size-[18px]" : "[&_svg]:size-4",
  );

/** Round icon button — the reference's back / add / mic buttons. */
export const CircleButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: CircleTone; size?: number }
>(function CircleButton({ label, tone = "surface", size = 40, className, style, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(circleClass(tone, size), className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
});

export function CircleLink({
  href,
  label,
  tone = "surface",
  size = 40,
  className,
  children,
}: {
  href: string;
  label: string;
  tone?: CircleTone;
  size?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} title={label} className={cn(circleClass(tone, size), className)} style={{ width: size, height: size }}>
      {children}
    </Link>
  );
}

/** Pill button with text. */
export const PillButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ink" | "soft" | "surface" | "outline"; size?: "sm" | "md" | "lg" }
>(function PillButton({ tone = "ink", size = "md", className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-8 px-3.5 text-[13px] [&_svg]:size-3.5" : size === "lg" ? "h-12 px-6 text-[15px] [&_svg]:size-[18px]" : "h-10 px-5 text-[14px] [&_svg]:size-4",
        tone === "ink" && "bg-accent text-on-accent hover:bg-accent-hover",
        tone === "soft" && "bg-[var(--chunk-soft)] text-current hover:bg-[var(--chunk-soft-2)]",
        tone === "surface" && "bg-elevated text-fg hover:bg-[color-mix(in_srgb,var(--bg-elevated)_90%,var(--text))]",
        tone === "outline" && "text-current shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:bg-hover",
        className,
      )}
      {...props}
    />
  );
});

export interface PillItem<V extends string> {
  value: V;
  label: string;
  count?: number;
  icon?: ReactNode;
}

/** Filter pills — "All 14 · Important · To-do". The selected pill is filled ink. */
export function PillTabs<V extends string>({
  items,
  value,
  onChange,
  className,
  size = "md",
}: {
  items: PillItem<V>[];
  value: V;
  onChange: (v: V) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Keep the selected pill visible when the row scrolls sideways (mobile).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  return (
    <div ref={listRef} role="tablist" className={cn("no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full font-normal transition-[background,color,box-shadow] duration-150",
              size === "sm" ? "h-8 pl-3 pr-3 text-[13px]" : "h-10 pl-4 pr-4 text-[14px]",
              item.count != null && (size === "sm" ? "pr-1.5" : "pr-2"),
              selected
                ? "bg-accent text-on-accent"
                : "text-fg-2 shadow-[inset_0_0_0_1.5px_var(--border-strong)] hover:text-fg hover:shadow-[inset_0_0_0_1.5px_var(--text-3)]",
            )}
          >
            {item.icon}
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  "flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11.5px] tabular",
                  size === "sm" ? "h-5" : "h-6",
                  selected ? "bg-on-accent/15" : "bg-hover",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Big two-line page title, like "My / Notes". */
export function BigTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("text-[40px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[54px]", className)}>{children}</h1>;
}

/** Small label above a chunk's content. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[12.5px] font-normal tracking-[0.01em] opacity-70", className)}>{children}</div>;
}

/** Round check used in chunk rows. Filled when done. */
export function CircleCheck({
  checked,
  onChange,
  label,
  className,
  size = 28,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!checked);
      }}
      className={cn(
        "group/check inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150",
        checked ? "bg-current" : "shadow-[inset_0_0_0_1.5px_currentColor] opacity-55 hover:opacity-100",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {checked ? (
        <svg viewBox="0 0 14 14" className="anim-check size-3.5" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5l2.5 2.5L11 4.5" className="stroke-[var(--check-stroke,var(--bg-elevated))]" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" className="size-3.5 opacity-0 transition-opacity group-hover/check:opacity-60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5l2.5 2.5L11 4.5" />
        </svg>
      )}
    </button>
  );
}

/** A collapsible chunk: shows a one-line summary until opened. */
export function Fold({
  title,
  summary,
  icon,
  tone = "surface",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  action,
  children,
  className,
  id,
}: {
  title: ReactNode;
  summary?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = controlledOpen ?? innerOpen;
  const toggle = () => {
    setInnerOpen(!open);
    onOpenChange?.(!open);
  };
  return (
    <section id={id} className={cn("scroll-mt-24", RADIUS, TONE[tone], className)}>
      <div className="flex items-center gap-3 p-2 pl-5">
        <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
          {icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", SOFT[tone])}>{icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-medium leading-tight">{title}</span>
            {summary && <span className={cn("mt-0.5 block truncate text-[13px]", MUTED[tone])}>{summary}</span>}
          </span>
        </button>
        {action}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse" : "Expand"}
          className={cn(circleClass(isColor(tone) || tone === "ink" ? "soft" : "ghost", 40), tone === "ink" && "bg-white/10 hover:bg-white/15")}
          style={{ width: 40, height: 40 }}
        >
          <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      {open && <div className="anim-fade px-5 pb-5">{children}</div>}
    </section>
  );
}

/** Small chip for metadata (dates, counts) — adapts to the card it sits on. */
export function Chip({ children, tone = "surface", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] [&_svg]:size-3.5", SOFT[tone], className)}>
      {children}
    </span>
  );
}

/** Pager dots — hint that a chunk holds more than it shows. */
export function Dots({ count, active = 0, className }: { count: number; active?: number; className?: string }) {
  if (count < 2) return null;
  return (
    <span className={cn("flex items-center justify-center gap-1", className)} aria-hidden>
      {Array.from({ length: Math.min(count, 5) }, (_, i) => (
        <span key={i} className={cn("size-1.5 rounded-full bg-current", i === active ? "opacity-80" : "opacity-25")} />
      ))}
    </span>
  );
}

/** Progress ring — progress at a glance without a number table. */
export function Ring({ value, size = 36, stroke = 3.5, className, children }: { value: number; size?: number; stroke?: number; className?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center text-[10.5px] font-medium tabular">{children}</span>}
    </span>
  );
}
