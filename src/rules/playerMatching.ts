// Player-matching nodes' pre-play choice (steal.md §9): the offered
// settings, the app's default, the guard over them, and the helper that
// resolves what a game actually starts with. Pure data about a choice, with
// no knowledge of a game state, leaving this a leaf module the way
// `clock.ts`, `combatSetting.ts`, `nodePlaystyle.ts`, `planetBonus.ts` and
// `scoring.ts` already are.

import type { NodePlaystyle } from "./nodePlaystyle";

/**
 * The player-matching nodes setting (steal.md §9): `"off"` matches no node
 * to either player; `"double"` counts a player's own node as two when it is
 * held at the end of their turn; `"required"` withholds a turn's node energy
 * entirely unless a player holds their own node. OFF / DOUBLE / REQUIRED are
 * the start screen's wording for these three values and live on the start
 * screen, not here. Offered only under the steal node playstyle — see
 * `resolvePlayerMatching`.
 */
export type PlayerMatchingSetting = "off" | "double" | "required";

/**
 * The offered player-matching settings, in the order the start screen
 * renders them: off first, then double before required. Which one the app
 * preselects is independent of the render order — see
 * `DEFAULT_PLAYER_MATCHING`.
 */
export const PLAYER_MATCHING_SETTINGS: readonly PlayerMatchingSetting[] = [
  "off",
  "double",
  "required",
];

/** The app's default: a turn's node energy requires holding one's own node. */
export const DEFAULT_PLAYER_MATCHING: PlayerMatchingSetting = "required";

/**
 * Whether a value is one of the offered player-matching settings. Unlike
 * `isClockSetting` and `isCombatSetting`, this guard has a real caller from
 * the start: `startingGameState` uses it to validate a player-matching
 * setting that arrives from outside the type system, such as an options
 * object built by a caller other than the start screen.
 */
export function isPlayerMatchingSetting(
  value: unknown,
): value is PlayerMatchingSetting {
  return (PLAYER_MATCHING_SETTINGS as readonly unknown[]).includes(value);
}

/**
 * The player-matching setting a game actually starts with, given the node
 * playstyle it starts under and the setting remembered on the start screen
 * (steal.md §9 applies only under steal): the remembered setting under
 * steal, `"off"` under continuous, planet or dedicated regardless of what
 * the start screen's group last held it at.
 */
export function resolvePlayerMatching(
  nodePlaystyle: NodePlaystyle,
  remembered: PlayerMatchingSetting,
): PlayerMatchingSetting {
  return nodePlaystyle === "steal" ? remembered : "off";
}
