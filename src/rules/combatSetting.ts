// Combat's pre-play choice (rules.md §7): the offered settings, the app's
// default and the guard over them. Pure data about a choice, with no
// knowledge of a game state, leaving this a leaf module the way `clock.ts`,
// `fleet.ts` and `nodes.ts` already are.

/**
 * The offered combat settings, in the order the start screen renders them:
 * leftmost is what the app preselects. `false` is combat off — no attack is
 * legal for either player (rules.md §7) — and `true` is the game §7
 * describes.
 */
export const COMBAT_SETTINGS: readonly boolean[] = [false, true];

/** The app's default: combat off. */
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
