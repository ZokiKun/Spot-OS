"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/directions/d3/lib/utils";

type Variant = "primary" | "blue" | "secondary" | "ghost" | "danger" | "white";
type Size = "sm" | "md" | "lg";

/**
 * Duolingo-style pressable buttons: solid fill + a darker bottom edge that collapses on press.
 * primary = green "go" action · blue = alternate action · secondary = white with a grey edge.
 */
const variants: Record<Variant, string> = {
  primary: "bg-green text-white shadow-[0_4px_0_var(--green-edge)] hover:brightness-105",
  blue: "bg-blue text-white shadow-[0_4px_0_var(--blue-edge)] hover:brightness-105",
  danger: "bg-red text-white shadow-[0_4px_0_var(--red-edge)] hover:brightness-105",
  secondary: "bg-bg text-blue border-2 border-line shadow-[0_2px_0_var(--border)] hover:bg-subtle [--press-depth:2px]",
  white: "bg-white/95 text-fg shadow-[0_4px_0_rgba(0,0,0,0.18)] hover:bg-white",
  ghost: "text-fg-2 hover:bg-hover hover:text-fg [--press-depth:0px]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[12.5px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[14px] gap-2 rounded-2xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "sm", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "press label-caps inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

/** Shared classes so links can look like buttons. */
export function buttonClasses(variant: Variant = "secondary", size: Size = "sm", className?: string) {
  return cn(
    "press label-caps inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: "sm" | "md" }>(
  function IconButton({ className, label, size = "sm", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl text-fg-2 transition-colors duration-100 hover:bg-hover hover:text-fg disabled:opacity-40",
          size === "sm" ? "size-8" : "size-10",
          className,
        )}
        {...props}
      />
    );
  },
);
