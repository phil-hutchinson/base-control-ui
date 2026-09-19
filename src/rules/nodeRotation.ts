// Inactive node rotation's pre-play choice (rules.md §8.2): the offered
// settings, the app's default and the guard over them. Pure data about a
// choice, with no knowledge of a game state, leaving this a leaf module the
// way `clock.ts`, `combatSetting.ts`, `fleet.ts`, `nodes.ts` and `scoring.ts`
// already are.

/**
 * How the three inactive nodes' priorities rotate (rules.md §8.2):
 * `"continuous"` rotates them at the end of every turn on which nothing
 * charged; `"planet"` and `"dedicated"` never rotate them on their own —
 * they rotate one step each time a ship lands on a planet or on a rotator
 * (section 3.3) respectively. CONTINUOUS/PLANET/DEDICATED are the start
 * screen's wording for these three values and live on the start screen,
 * not here.
 */
export type NodeRotationSetting = "continuous" | "planet" | "dedicated";

/**
 * The offered node rotation settings, in the order the start screen renders
 * them: leftmost is what the app preselects.
 */
export const NODE_ROTATION_SETTINGS: readonly NodeRotationSetting[] = [
  "continuous",
  "planet",
  "dedicated",
];

/** The app's default: continuous rotation, today's rule unchanged. */
export const DEFAULT_NODE_ROTATION: NodeRotationSetting = "continuous";

/**
 * Whether a value is one of the offered node rotation settings. Unlike
 * `isClockSetting` and `isCombatSetting`, this guard has a real caller from
 * the start: `startingGameState` uses it to validate a node rotation
 * setting that arrives from outside the type system, such as an options
 * object built by a caller other than the start screen.
 */
export function isNodeRotationSetting(
  value: unknown,
): value is NodeRotationSetting {
  return (NODE_ROTATION_SETTINGS as readonly unknown[]).includes(value);
}
