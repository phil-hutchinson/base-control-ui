// Scoring's pre-play choice (rules.md §8.4): the offered settings, the
// app's default and the guard over them. Pure data about a choice, with no
// knowledge of a game state, leaving this a leaf module the way `clock.ts`,
// `combatSetting.ts`, `fleet.ts` and `nodes.ts` already are.

/**
 * A scoring setting: `"simple"` pays one energy for each charged node held,
 * `"bonus"` pays the triangular total of the nodes held (rules.md §8.4).
 * SIMPLE and BONUS are the start screen's wording for these two values and
 * live on the start screen, not here.
 */
export type ScoringSetting = "simple" | "bonus";

/**
 * The offered scoring settings, in the order the start screen renders them:
 * leftmost is what the app preselects.
 */
export const SCORING_SETTINGS: readonly ScoringSetting[] = ["simple", "bonus"];

/** The app's default: simple scoring. */
export const DEFAULT_SCORING: ScoringSetting = "simple";

/**
 * Whether a value is one of the offered scoring settings. Unlike
 * `isClockSetting` and `isCombatSetting`, this guard has a real caller from
 * the start: `startingGameState` uses it to validate a scoring setting that
 * arrives from outside the type system, such as an options object built by
 * a caller other than the start screen.
 */
export function isScoringSetting(value: unknown): value is ScoringSetting {
  return (SCORING_SETTINGS as readonly unknown[]).includes(value);
}
