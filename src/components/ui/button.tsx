"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-[inset_0_0_0_1px_rgba(15,15,15,0.1),0_1px_2px_rgba(15,15,15,0.1)]",
  secondary: "bg-bg text-fg shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover",
  ghost: "text-fg-2 hover:bg-hover hover:text-fg",
  danger: "text-danger shadow-[inset_0_0_0_1px_rgba(235,87,87,0.5)] hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2 text-[13px] gap-1.5 rounded-md",
  md: "h-8 px-3 text-[14px] gap-1.5 rounded-md",
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
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: "sm" | "md" }>(
  function IconButton({ className, label, size = "sm", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md text-fg-2 transition-colors duration-100 hover:bg-hover hover:text-fg disabled:opacity-40",
          size === "sm" ? "size-6" : "size-7",
          className,
        )}
        {...props}
      />
    );
  },
);
