// A ship's power level (rules.md §4.1): the 0-6 range only. What a move or
// an attack costs, and what a ship gains on a planet, live in movement.ts
// and endOfTurn.ts.

/** How much power a ship carries, 0 to 6 (rules.md §4.1). */
export type PowerLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The least power a ship can carry. */
export const MIN_POWER = 0;

/** The most power a ship can carry. */
export const MAX_POWER = 6;

/** Whether a number is a valid power level. */
export function isPowerLevel(value: number): value is PowerLevel {
  return Number.isInteger(value) && value >= MIN_POWER && value <= MAX_POWER;
}

/**
 * `power` less `cost` — what a ship carries after paying for a move or an
 * attack (rules.md §6, §7). Validated with `isPowerLevel` rather than cast:
 * a move or an attack is only ever applied once its cost is known to be
 * affordable, so a result outside the 0–6 range means that check was wrong,
 * and this throws rather than silently producing a power level that
 * typechecks but cannot exist.
 */
export function spendPower(power: PowerLevel, cost: PowerLevel): PowerLevel {
  const result = power - cost;
  if (!isPowerLevel(result)) {
    throw new RangeError(
      `spendPower: spending ${cost} power from ${power} would leave ${result}, outside the ${MIN_POWER}-${MAX_POWER} range`,
    );
  }
  return result;
}
