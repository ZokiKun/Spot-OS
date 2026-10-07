/** Which design direction to render. Shared by the server (layouts) and the Settings switcher. */
export type DirectionId = 1 | 2 | 3;

export const DIRECTION_COOKIE = "spotos-direction";

const fallback = Number(process.env.NEXT_PUBLIC_DEFAULT_DIRECTION);
export const DEFAULT_DIRECTION: DirectionId = fallback === 2 || fallback === 3 ? fallback : 1;

export function parseDirection(value: string | null | undefined): DirectionId | null {
  return value === "1" ? 1 : value === "2" ? 2 : value === "3" ? 3 : null;
}

/** Remember the choice for a year and reload so the server renders the other direction. */
export function switchDirection(id: DirectionId) {
  document.cookie = `${DIRECTION_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
