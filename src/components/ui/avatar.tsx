import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

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
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong", className)}
        style={{ width: size, height: size }}
      />
    );
  return (
    <span
      title={profile.full_name}
      className={cn(
        `tag-${profile.color}`,
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-[var(--tag-text)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.45)) }}
    >
      {initials(profile.full_name).slice(0, size < 22 ? 1 : 2)}
    </span>
  );
}

export function PersonChip({ profile, size = 20 }: { profile: Profile | null | undefined; size?: number }) {
  if (!profile) return <span className="text-fg-3">Unassigned</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar profile={profile} size={size} />
      <span className="truncate">{profile.full_name}</span>
    </span>
  );
}

/** Overlapping avatars for several people; shows "+N" past `max`. */
export function AvatarStack({ profiles, size = 20, max = 3 }: { profiles: (Profile | null | undefined)[]; size?: number; max?: number }) {
  const list = profiles.filter((p): p is Profile => !!p);
  if (!list.length) return null;
  const shown = list.length > max ? list.slice(0, max - 1) : list;
  const extra = list.length - shown.length;
  return (
    <span className="inline-flex shrink-0 items-center" title={list.map((p) => p.full_name).join(", ")}>
      {shown.map((p, i) => (
        <Avatar key={p.id} profile={p} size={size} className={cn("ring-2 ring-[var(--bg)]", i > 0 && "-ml-1.5")} />
      ))}
      {extra > 0 && (
        <span
          className="-ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full bg-elevated font-medium text-fg-2 ring-2 ring-[var(--bg)]"
          style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
