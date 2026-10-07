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
