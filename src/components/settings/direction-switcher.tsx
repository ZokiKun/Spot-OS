"use client";

import { Check } from "lucide-react";
import { CURRENT_DIRECTION, DIRECTIONS, directionOrigin, type DirectionId } from "@/lib/directions";
import { cn } from "@/lib/utils";
import { SettingsSection } from "./settings-ui";

/** Switch design direction: opens the current page in the chosen direction's deployment. */
export function DirectionSwitcher() {
  const go = (id: DirectionId) => {
    const origin = directionOrigin(id);
    if (!origin || id === CURRENT_DIRECTION) return;
    // A different deployment, so a full page load rather than client-side routing.
    window.location.assign(new URL(`${window.location.pathname}${window.location.search}`, origin));
  };
  return (
    <SettingsSection
      title="Design direction"
      description="Spot OS is being explored in three directions. Pick one to open this same page in it. Each direction keeps its own demo data."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {DIRECTIONS.map((d) => {
          const current = d.id === CURRENT_DIRECTION;
          const available = current || directionOrigin(d.id) != null;
          return (
            <button
              key={d.id}
              type="button"
              disabled={!available}
              aria-pressed={current}
              onClick={() => go(d.id)}
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
              <span className="text-[12.5px] leading-snug opacity-70">{available ? d.description : "Available on the live site."}</span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
