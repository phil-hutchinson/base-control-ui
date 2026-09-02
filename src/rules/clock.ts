// §10's clock: the offered settings and the arithmetic that turns one, plus
// a game's length, into a starting budget in milliseconds. No wall-clock
// reading of any kind lives here — the rules layer is told when a player has
// run out of time, it never asks what time it is.

import { isGameLengthRounds } from "./gameLength";

/**
 * A clock setting: no clock, or seconds a turn. `"none"` is a value of this
 * type, not the absence of one, so nothing has to special-case "is there a
 * clock?" beyond the budget function below.
 */
export type ClockSetting = "none" | 6 | 4 | 2;

/**
 * The offered clock settings, in the order the start screen renders them:
 * leftmost is the standard game.
 */
export const CLOCK_SETTINGS: readonly ClockSetting[] = ["none", 6, 4, 2];

/** §10's standard game: no clock. */
export const DEFAULT_CLOCK_SETTING: ClockSetting = "none";

/**
 * Whether a value is one of the offered clock settings. Nothing in the app
 * calls this yet; it exists for the boundary a future caller will need — a
 * saved-options load, or a game record — where a clock setting arrives from
 * outside the type system.
 */
export function isClockSetting(value: unknown): value is ClockSetting {
  return (CLOCK_SETTINGS as readonly unknown[]).includes(value);
}

/**
 * The starting budget, in milliseconds, for one side of a game of
 * `lengthInRounds` rounds at the given clock setting: seconds a turn
 * multiplied by the number of turns the length gives a side (rules.md §10).
 * `"none"` budgets `Number.POSITIVE_INFINITY`, which lets every consumer
 * treat "no clock" as a clock that simply never runs out, rather than as a
 * separate case.
 */
export function startingBudgetMs(
  lengthInRounds: number,
  setting: ClockSetting,
): number {
  if (!isGameLengthRounds(lengthInRounds)) {
    throw new RangeError(
      `startingBudgetMs: lengthInRounds must be a positive integer, got ${lengthInRounds}`,
    );
  }
  if (setting === "none") {
    return Number.POSITIVE_INFINITY;
  }
  return lengthInRounds * setting * 1000;
}
