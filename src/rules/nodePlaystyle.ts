// The node playstyle's pre-play choice (rules.md §8.2): the offered
// settings, the app's default and the guard over them. Pure data about a
// choice, with no knowledge of a game state, leaving this a leaf module the
// way `clock.ts`, `combatSetting.ts`, `fleet.ts`, `nodes.ts` and `scoring.ts`
// already are.

/**
 * The node playstyle (rules.md §8.2): `"continuous"` rotates the three
 * inactive nodes' priorities at the end of every turn on which nothing
 * charged; `"planet"` and `"dedicated"` never rotate them on their own —
 * they rotate one step each time a ship lands on a planet or on a rotator
 * (section 3.3) respectively. `"steal"` is not a fourth way of rotating
 * anything — it is a different game of nodes entirely, whose rules are
 * `doc/ruleset/steal.md`'s. CONTINUOUS/PLANET/DEDICATED/STEAL are the start
 * screen's wording for these four values and live on the start screen, not
 * here.
 */
export type NodePlaystyle = "continuous" | "planet" | "dedicated" | "steal";

/**
 * The offered node playstyles, in the order the start screen renders them:
 * the three rotation settings, simplest first, then steal last, since it is
 * a different game of nodes rather than a fourth rotation. Which one the app
 * preselects is independent of the render order — see
 * `DEFAULT_NODE_PLAYSTYLE`.
 */
export const NODE_PLAYSTYLES: readonly NodePlaystyle[] = [
  "continuous",
  "planet",
  "dedicated",
  "steal",
];

/** The app's default: steal. */
export const DEFAULT_NODE_PLAYSTYLE: NodePlaystyle = "steal";

/**
 * Whether a value is one of the offered node playstyles. Unlike
 * `isClockSetting` and `isCombatSetting`, this guard has a real caller from
 * the start: `startingGameState` uses it to validate a node playstyle that
 * arrives from outside the type system, such as an options object built by
 * a caller other than the start screen.
 */
export function isNodePlaystyle(value: unknown): value is NodePlaystyle {
  return (NODE_PLAYSTYLES as readonly unknown[]).includes(value);
}
