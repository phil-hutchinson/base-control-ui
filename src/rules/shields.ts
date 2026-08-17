// A ship's shield count (rules.md §4.1): the 0-4 range only. Gaining a
// shield, losing one, and every effect shields have on movement or combat
// live elsewhere, once that machinery exists.

/** The number of shields a ship carries, 0 to 4 (rules.md §4.1). */
export type ShieldCount = 0 | 1 | 2 | 3 | 4;

/** The fewest shields a ship can carry. */
export const MIN_SHIELDS = 0;

/** The most shields a ship can carry. */
export const MAX_SHIELDS = 4;

/** Whether a number is a valid shield count. */
export function isShieldCount(value: number): value is ShieldCount {
  return (
    Number.isInteger(value) && value >= MIN_SHIELDS && value <= MAX_SHIELDS
  );
}
