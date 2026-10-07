import type { Profile } from "@/directions/d3/lib/types";
import { cn, initials } from "@/directions/d3/lib/utils";

/** Solid colour circle with a white initial (Duolingo leaderboard avatars). */
export function Avatar({
  profile,
  size = 20,
  className,
}: {
  profile: Pick<Profile, "full_name" | "color"> | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!profile)
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong", className)}
        style={{ width: size, height: size }}
      />
    );
  return (
    <span
      title={profile.full_name}
      className={cn(
        `dot-${profile.color}`,
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.44)) }}
    >
      {initials(profile.full_name).slice(0, size < 26 ? 1 : 2)}
    </span>
  );
}

export function PersonChip({ profile, size = 22 }: { profile: Profile | null | undefined; size?: number }) {
  if (!profile) return <span className="text-fg-3">Nobody yet</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar profile={profile} size={size} />
      <span className="truncate font-bold">{profile.full_name}</span>
    </span>
  );
}

/** Overlapping avatars for "who's on it". */
export function AvatarStack({ people, size = 28, max = 4 }: { people: (Profile | undefined)[]; size?: number; max?: number }) {
  const list = people.filter(Boolean) as Profile[];
  return (
    <span className="inline-flex items-center">
      {list.slice(0, max).map((p, i) => (
        <Avatar key={p.id} profile={p} size={size} className={cn("ring-[3px] ring-bg", i > 0 && "-ml-2")} />
      ))}
      {list.length > max && <span className="ml-1.5 text-[12px] font-bold text-fg-2">+{list.length - max}</span>}
    </span>
  );
}
