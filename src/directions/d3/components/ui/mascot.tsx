import { cn } from "@/directions/d3/lib/utils";

export type Mood = "happy" | "cheer" | "think" | "sleepy" | "worried";

/**
 * Spotty — Studio Spot's mascot: an orange spot with big eyes and a sprout.
 * Plays the role Duo plays in Duolingo: banners, empty states, celebrations.
 */
export function Mascot({ mood = "happy", size = 96, className, float = false }: { mood?: Mood; size?: number; className?: string; float?: boolean }) {
  const closed = mood === "sleepy";
  const look = mood === "think" ? { x: 2.5, y: -3 } : mood === "worried" ? { x: 0, y: 1.5 } : { x: 1, y: 1.5 };
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 select-none", float && "anim-float", className)}
    >
      {/* shadow */}
      <ellipse cx="50" cy="95" rx="26" ry="3.5" fill="currentColor" opacity="0.08" />
      {/* sprout */}
      <path d="M50 18 C50 12 52 8 56 6" stroke="#58a700" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M55 7 C61 2 69 4 70 9 C64 12 58 11 55 7 Z" fill="#58cc02" />
      {/* feet */}
      <ellipse cx="36" cy="90" rx="9" ry="5" fill="#e08600" />
      <ellipse cx="64" cy="90" rx="9" ry="5" fill="#e08600" />
      {/* body */}
      <circle cx="50" cy="54" r="38" fill="#ff9600" />
      <path d="M12.6 60 A38 38 0 0 0 87.4 60 A44 30 0 0 1 12.6 60 Z" fill="#e08600" opacity="0.55" />
      <ellipse cx="34" cy="32" rx="9" ry="5" fill="#fff" opacity="0.35" transform="rotate(-25 34 32)" />
      {/* cheeks */}
      <ellipse cx="25" cy="62" rx="5.5" ry="3.5" fill="#ff6b3d" opacity="0.45" />
      <ellipse cx="75" cy="62" rx="5.5" ry="3.5" fill="#ff6b3d" opacity="0.45" />
      {/* eyes */}
      {closed ? (
        <>
          <path d="M28 50 Q37 56 46 50" stroke="#4b4b4b" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M54 50 Q63 56 72 50" stroke="#4b4b4b" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="37" cy="47" rx="11" ry="13" fill="#fff" />
          <ellipse cx="63" cy="47" rx="11" ry="13" fill="#fff" />
          <circle cx={37 + look.x} cy={48 + look.y} r="6" fill="#4b4b4b" />
          <circle cx={63 + look.x} cy={48 + look.y} r="6" fill="#4b4b4b" />
          <circle cx={39 + look.x} cy={45.5 + look.y} r="2" fill="#fff" />
          <circle cx={65 + look.x} cy={45.5 + look.y} r="2" fill="#fff" />
          {mood === "worried" && (
            <>
              <path d="M26 33 L44 37" stroke="#4b4b4b" strokeWidth="3" strokeLinecap="round" />
              <path d="M74 33 L56 37" stroke="#4b4b4b" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {/* mouth */}
      {mood === "cheer" ? (
        <path d="M40 66 Q50 80 60 66 Z" fill="#7a2e00" stroke="#7a2e00" strokeWidth="2" strokeLinejoin="round" />
      ) : mood === "worried" ? (
        <path d="M42 71 Q50 66 58 71" stroke="#7a2e00" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : mood === "think" ? (
        <path d="M44 69 L56 68" stroke="#7a2e00" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : mood === "sleepy" ? (
        <ellipse cx="50" cy="69" rx="3.5" ry="3" fill="#7a2e00" />
      ) : (
        <path d="M41 66 Q50 74 59 66" stroke="#7a2e00" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

/** Speech bubble that sits next to the mascot (Duolingo onboarding style). */
export function SpeechBubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-2xl border-2 border-line bg-bg px-4 py-3 text-[15px] font-bold leading-snug text-fg", className)}>
      <span className="absolute -left-[9px] top-5 size-4 rotate-45 border-b-2 border-l-2 border-line bg-bg" aria-hidden />
      <span className="relative">{children}</span>
    </div>
  );
}
