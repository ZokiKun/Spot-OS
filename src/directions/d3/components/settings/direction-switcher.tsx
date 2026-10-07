"use client";

import { Check } from "lucide-react";
import { CURRENT_DIRECTION, DIRECTIONS } from "@/directions/d3/lib/directions";
import { switchDirection } from "@/lib/direction-cookie";
import { cn } from "@/directions/d3/lib/utils";
import { SettingsSection } from "./settings-ui";

/** Switch design direction in place: the same page re-renders in the chosen direction. */
export function DirectionSwitcher() {
  return (
    <SettingsSection
      title="Design direction"
      description="Spot OS is being explored in three directions. Pick one to see this same page, with the same data, in that design. Saved on this device."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {DIRECTIONS.map((d) => {
          const current = d.id === CURRENT_DIRECTION;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={current}
              onClick={() => !current && switchDirection(d.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                current ? "bg-accent text-white" : "bg-hover hover:bg-active",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2 text-[12px] opacity-70">
                Direction {d.id}
                {current && <Check className="size-4" />}
              </span>
              <span className="text-[16px] font-semibold">{d.label}</span>
              <span className="text-[12.5px] leading-snug opacity-70">{d.description}</span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
