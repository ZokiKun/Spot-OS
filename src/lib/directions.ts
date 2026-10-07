/**
 * Spot OS is being explored in three design directions, each deployed from its own branch.
 * The Settings switcher jumps to the same page in another direction's deployment.
 */
export type DirectionId = 1 | 2 | 3;

export const DIRECTIONS: { id: DirectionId; branch: string; label: string; description: string }[] = [
  { id: 1, branch: "main", label: "Classic", description: "Notion-style: sidebar, tables and properties, everything visible at once." },
  { id: 2, branch: "direction-2", label: "Chunks", description: "Big colourful cards that each answer one question; details folded away." },
  { id: 3, branch: "direction-3", label: "Playful", description: "Duolingo-inspired: chunky pressable buttons, bold friendly colour." },
];

/** The direction this build belongs to. */
export const CURRENT_DIRECTION: DirectionId = 1;

// Literal process.env reads so Next inlines them at build time.
const EXPLICIT: Record<DirectionId, string | undefined> = {
  1: process.env.NEXT_PUBLIC_DIRECTION_1_URL,
  2: process.env.NEXT_PUBLIC_DIRECTION_2_URL,
  3: process.env.NEXT_PUBLIC_DIRECTION_3_URL,
};
const VERCEL_REF = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
const VERCEL_BRANCH_URL = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;
const VERCEL_PRODUCTION_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

const branchSlug = (branch: string) => branch.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Where a direction is deployed. An explicit NEXT_PUBLIC_DIRECTION_<n>_URL wins.
 * On Vercel, direction 1 is the production URL and the others are derived from this
 * deployment's branch URL (…-git-<branch>-<team>.vercel.app). Null when unknown (e.g. local dev).
 */
export function directionOrigin(id: DirectionId): string | null {
  const explicit = EXPLICIT[id];
  if (explicit) return explicit.replace(/\/+$/, "");
  const target = DIRECTIONS.find((d) => d.id === id)!;
  if (id === 1 && VERCEL_PRODUCTION_URL) return `https://${VERCEL_PRODUCTION_URL}`;
  if (VERCEL_REF && VERCEL_BRANCH_URL) {
    const own = `-git-${branchSlug(VERCEL_REF)}-`;
    if (VERCEL_BRANCH_URL.includes(own)) return `https://${VERCEL_BRANCH_URL.replace(own, `-git-${branchSlug(target.branch)}-`)}`;
  }
  return null;
}
