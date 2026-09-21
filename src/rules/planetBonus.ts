// Planet bonus's pre-play choice (rules.md §3.4): the offered settings, the
// app's default, the guard over them and the payout each carries. Pure data
// about a choice, with no knowledge of a game state or of which planets are
// dealt to which side, leaving this a leaf module the way `clock.ts`,
// `combatSetting.ts`, `nodeRotation.ts` and `scoring.ts` already are.

/**
 * A planet bonus setting: `"off"` pays nothing, `"two"` and `"three"` pay
 * that many points the first time one of a player's ships lands on one of
 * their three bonus planets (rules.md §3.4). OFF / 2 POINTS / 3 POINTS are
 * the start screen's wording for these three values and live on the start
 * screen, not here.
 */
export type PlanetBonusSetting = "off" | "two" | "three";

/**
 * The offered planet bonus settings, in the order the start screen renders
 * them: leftmost is what the app preselects.
 */
export const PLANET_BONUS_SETTINGS: readonly PlanetBonusSetting[] = [
  "off",
  "two",
  "three",
];

/** The app's default: no planet bonus, today's rule unchanged. */
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
 * The energy a planet bonus pays under the given setting (rules.md §3.4): 0
 * for off, 2 for two, 3 for three. The one place the settings' words and
 * their payouts are tied together.
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
