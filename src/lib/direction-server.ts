import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_DIRECTION, DIRECTION_COOKIE, parseDirection, type DirectionId } from "./direction-cookie";

export async function getDirection(): Promise<DirectionId> {
  return parseDirection((await cookies()).get(DIRECTION_COOKIE)?.value) ?? DEFAULT_DIRECTION;
}

/** Pick the component for the active direction. */
export async function pick<T>(byDirection: Record<DirectionId, T>): Promise<T> {
  return byDirection[await getDirection()];
}
