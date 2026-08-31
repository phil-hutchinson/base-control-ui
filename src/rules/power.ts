// A ship's power level (rules.md §4.1): the 0-4 range only. Gaining a
// point and losing one live in endOfTurn.ts; what power does to reach
// lives in movement.ts.

/** How much power a ship carries, 0 to 4 (rules.md §4.1). */
export type PowerLevel = 0 | 1 | 2 | 3 | 4;

/** The least power a ship can carry. */
export const MIN_POWER = 0;

/** The most power a ship can carry. */
export const MAX_POWER = 4;

/** Whether a number is a valid power level. */
export function isPowerLevel(value: number): value is PowerLevel {
  return Number.isInteger(value) && value >= MIN_POWER && value <= MAX_POWER;
}
