/** The three design directions of Spot OS, all shipped in one build. */
export { type DirectionId } from "@/lib/direction-cookie";
import type { DirectionId } from "@/lib/direction-cookie";

export const DIRECTIONS: { id: DirectionId; label: string; description: string }[] = [
  { id: 1, label: "Classic", description: "Notion-style: sidebar, tables and properties, everything visible at once." },
  { id: 2, label: "Chunks", description: "Big colourful cards that each answer one question; details folded away." },
  { id: 3, label: "Playful", description: "Duolingo-inspired: chunky pressable buttons, bold friendly colour." },
];

/** The direction these components belong to. */
export const CURRENT_DIRECTION: DirectionId = 2;
