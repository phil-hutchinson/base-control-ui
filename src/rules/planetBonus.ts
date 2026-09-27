// Planet bonus's pre-play choice (rules.md §3.4): the offered settings, which
// of them a node playstyle offers, the app's default, the guard over them and
// the classic payout each of the classic settings carries. Pure data about a
// choice, with no knowledge of a game state or of which planets are dealt to
// which side, leaving this a leaf module the way `clock.ts`,
// `combatSetting.ts`, `nodePlaystyle.ts` and `scoring.ts` already are. The
// advanced setting's own rules — the two bonuses, their kinds and the point
// table — live in `advancedBonus.ts`; this module only knows its name and
// that it is offered under steal alone.

import type { NodePlaystyle } from "./nodePlaystyle";

/**
 * A planet bonus setting: `"off"` pays nothing; `"two"` and `"three"` pay
 * that many points the first time one of a player's ships lands on one of
 * their three bonus planets; `"advanced"` (steal.md §10, offered only under
 * the steal node playstyle) replaces the per-player planets with two
 * contested bonuses of six possible kinds (rules.md §3.4). OFF / 2 POINTS /
 * 3 POINTS / ADVANCED are the start screen's wording for these four values
 * and live on the start screen, not here.
 */
export type PlanetBonusSetting = "off" | "two" | "three" | "advanced";

/**
 * The three classic planet bonus settings — every one but advanced — offered
 * under every node playstyle and paid by `planetBonusPoints`.
 */
export type ClassicPlanetBonusSetting = "off" | "two" | "three";

/**
 * Every planet bonus setting, in the order the start screen renders them
 * under steal: off first, then smallest classic payment to largest, then
 * advanced last. Which one the app preselects is independent of the render
 * order — see `DEFAULT_PLANET_BONUS`. Not every node playstyle offers all
 * four — see `offeredPlanetBonusSettings`.
 */
export const PLANET_BONUS_SETTINGS: readonly PlanetBonusSetting[] = [
  "off",
  "two",
  "three",
  "advanced",
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
 * The planet bonus settings offered for a given node playstyle (rules.md
 * §3.4, steal.md §10): the three classic settings under continuous, planet
 * and dedicated, plus advanced under steal. The start screen renders this
 * list rather than the raw `PLANET_BONUS_SETTINGS`, so advanced never shows
 * outside steal.
 */
export function offeredPlanetBonusSettings(
  nodePlaystyle: NodePlaystyle,
): readonly PlanetBonusSetting[] {
  return nodePlaystyle === "steal"
    ? PLANET_BONUS_SETTINGS
    : PLANET_BONUS_SETTINGS.filter((setting) => setting !== "advanced");
}

/**
 * The energy a classic planet bonus pays under the given setting (rules.md
 * §3.4): 0 for off, 2 for two, 3 for three. The one place the classic
 * settings' words and their payouts are tied together. Takes only the
 * classic settings — advanced's point amounts are
 * `advancedBonus.ts`'s `advancedBonusPoints`, sized by the game's node
 * count, scoring and player-matching setting rather than fixed per setting.
 */
export function planetBonusPoints(setting: ClassicPlanetBonusSetting): number {
  switch (setting) {
    case "off":
      return 0;
    case "two":
      return 2;
    case "three":
      return 3;
  }
}
