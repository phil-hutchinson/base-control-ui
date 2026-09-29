// Combat's pre-play choice (rules.md §7): the offered settings, the
// fallback a game state uses when none is given, and the guard over them. Pure data about a choice, with no
// knowledge of a game state, leaving this a leaf module the way `clock.ts`,
// `fleet.ts` and `nodes.ts` already are.

/**
 * The combat settings rules.md §7 offers, off first. `false` is combat off —
 * no attack is legal for either player — and `true` is the game §7
 * describes. The start screen offers no combat choice; the app starts every
 * game with combat off.
 */
export const COMBAT_SETTINGS: readonly boolean[] = [false, true];

/** The setting `startingGameState` uses when none is given: combat off. */
export const DEFAULT_COMBAT_ENABLED = false;

/**
 * Whether a value is one of the offered combat settings. Nothing in the app
 * calls this yet; it exists for the boundary a future caller will need — a
 * saved-options load, or a game record — where a setting arrives from
 * outside the type system, exactly as `isClockSetting` does for §10's.
 */
export function isCombatSetting(value: unknown): value is boolean {
  return (COMBAT_SETTINGS as readonly unknown[]).includes(value);
}
