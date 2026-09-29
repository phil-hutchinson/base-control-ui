// Planet bonus's pre-play choice (rules.md §3.4): the offered settings, the
// app's default, the guard over them, the helper that resolves what a game
// actually starts with, and the payout each setting carries. Pure data about
// a choice, with no knowledge of a game state or of which planets are dealt
// to which side, leaving this a leaf module the way `clock.ts`,
// `combatSetting.ts`, `nodePlaystyle.ts`, `planetActivity.ts`,
// `playerMatching.ts` and `scoring.ts` already are. The steal playstyle's
// planet choice is planet effects (`planetActivity.ts`), not this one.

import type { NodePlaystyle } from "./nodePlaystyle";

/**
 * A planet bonus setting (rules.md §3.4): `"off"` pays nothing; `"two"` and
 * `"three"` pay that many points the first time one of a player's ships
 * lands on one of their three bonus planets. OFF / 2 POINTS / 3 POINTS are
 * the start screen's wording for these three values and live on the start
 * screen, not here. Offered under continuous, planet and dedicated only —
 * see `resolvePlanetBonus`.
 */
export type PlanetBonusSetting = "off" | "two" | "three";

/**
 * The offered planet bonus settings, in the order the start screen renders
 * them: off first, then smallest payment to largest. Which one the app
 * preselects is independent of the render order — see
 * `DEFAULT_PLANET_BONUS`.
 */
export const PLANET_BONUS_SETTINGS: readonly PlanetBonusSetting[] = [
  "off",
  "two",
  "three",
];

/** The app's default: no planet bonus. */
export const DEFAULT_PLANET_BONUS: PlanetBonusSetting = "off";

/**
 * Whether a value is one of the offered planet bonus settings. Unlike
 * `isClockSetting` and `isCombatSetting`, this guard has a real caller from
 * the start: `startingGameState` uses it to validate a planet bonus setting
 * that arrives from outside the type system, such as an options object built
 * by a caller other than the start screen.
 */
export function isPlanetBonusSetting(
  value: unknown,
): value is PlanetBonusSetting {
  return (PLANET_BONUS_SETTINGS as readonly unknown[]).includes(value);
}

/**
 * The planet bonus setting a game actually starts with, given the node
 * playstyle it starts under and the setting remembered on the start screen
 * (rules.md §3.4 offers planet bonus only outside steal): the remembered
 * setting under continuous, planet or dedicated, `"off"` under steal
 * regardless of what the start screen's group last held it at.
 */
export function resolvePlanetBonus(
  nodePlaystyle: NodePlaystyle,
  remembered: PlanetBonusSetting,
): PlanetBonusSetting {
  return nodePlaystyle === "steal" ? "off" : remembered;
}

/**
 * The energy a planet bonus pays under the given setting (rules.md §3.4): 0
 * for off, 2 for two, 3 for three. The one place the settings' words and
 * their payouts are tied together. An activity bonus's point amounts are
 * `activityBonus.ts`'s `activityBonusPoints`, sized by the game's node
 * count, scoring and player-matching setting rather than fixed per setting.
 */
export function planetBonusPoints(setting: PlanetBonusSetting): number {
  switch (setting) {
    case "off":
      return 0;
    case "two":
      return 2;
    case "three":
      return 3;
  }
}
