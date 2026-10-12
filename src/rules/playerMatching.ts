// Player-matching nodes' pre-play choice (steal.md §9): the offered
// settings, the app's default, the guard over them, the helper that
// resolves what a game actually starts with, the charged-node counts each
// setting offers, and the helper that resolves the remembered count against
// the resolved setting. Pure data about a choice, with no knowledge of a
// game state, leaving this a leaf module the way `clock.ts`,
// `combatSetting.ts`, `nodePlaystyle.ts`, `planetBonus.ts` and `scoring.ts`
// already are.

import { CHARGED_NODE_COUNTS, type ChargedNodeCount } from "./nodes";
import type { NodePlaystyle } from "./nodePlaystyle";

/**
 * The player-matching nodes setting (steal.md §9): `"off"` matches no node
 * to either player; `"double"` counts a player's own node as two when it is
 * held at the end of their turn; `"required"` withholds a turn's node energy
 * entirely unless a player holds their own node; `"immediate"` makes each
 * player's own node a single square that pays them at once on landing and
 * then moves, rather than something held. OFF / DOUBLE / REQUIRED / IMMEDIATE
 * are the start screen's wording for these four values and live on the start
 * screen, not here. Offered only under the steal node playstyle — see
 * `resolvePlayerMatching`.
 */
export type PlayerMatchingSetting = "off" | "double" | "required" | "immediate";

/**
 * The offered player-matching settings, in the order the start screen
 * renders them: off first, then double, required and immediate. Which one
 * the app preselects is independent of the render order — see
 * `DEFAULT_PLAYER_MATCHING`.
 */
export const PLAYER_MATCHING_SETTINGS: readonly PlayerMatchingSetting[] = [
  "off",
  "double",
  "required",
  "immediate",
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

/**
 * The charged-node choice (rules.md §8.1) a given player-matching setting
 * offers: `[4, 3]` under immediate, since it counts the ordinary nodes only
 * and does not offer five (steal.md §1, §9); `CHARGED_NODE_COUNTS` — `[5, 4,
 * 3]` — under every other setting, unchanged.
 */
export function chargedNodeCountsForPlayerMatching(
  playerMatching: PlayerMatchingSetting,
): readonly ChargedNodeCount[] {
  return playerMatching === "immediate" ? [4, 3] : CHARGED_NODE_COUNTS;
}

/**
 * The charged-node count a game actually starts with, given the node
 * playstyle, the player-matching setting and the count remembered on the
 * start screen: 4 when the resolved player-matching setting
 * (`resolvePlayerMatching`) is immediate and the remembered count is 5 — the
 * one count immediate does not offer — otherwise the remembered count
 * unchanged. This is what lets the start screen remember 5 even while
 * immediate is showing 4, and show 5 again the moment another
 * player-matching setting, or another playstyle, is chosen.
 */
export function resolvePlayerMatchingChargedNodeCount(
  nodePlaystyle: NodePlaystyle,
  remembered: PlayerMatchingSetting,
  rememberedCount: ChargedNodeCount,
): ChargedNodeCount {
  const resolved = resolvePlayerMatching(nodePlaystyle, remembered);
  return resolved === "immediate" && rememberedCount === 5
    ? 4
    : rememberedCount;
}
