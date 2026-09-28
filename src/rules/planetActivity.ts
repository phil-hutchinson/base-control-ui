// The planet resources setting's pre-play choice (rules.md §3.4, steal.md
// §10): the offered settings, the app's default, the guard over them, and
// the helper that resolves what a game actually starts with. Pure data about
// a choice, with no knowledge of a game state, leaving this a leaf module the
// way `clock.ts`, `combatSetting.ts`, `nodePlaystyle.ts`, `planetBonus.ts`,
// `playerMatching.ts` and `scoring.ts` already are. The rules of the two
// activity bonuses that stand on the board while it is on — their kinds, the
// point table, the deal and the claim — live in `activityBonus.ts`.

import type { NodePlaystyle } from "./nodePlaystyle";

/**
 * A planet resources setting (steal.md §10): `"off"` puts no bonus on the
 * board; `"stable"` and `"race"` both put two contested bonuses of six
 * possible kinds on it, and when one is claimed a new one replaces it — under
 * stable the one left standing keeps its kind, under race it changes kind.
 * OFF / STABLE / RACE are the start screen's wording for these values and
 * live on the start screen, not here. Offered only under the steal node playstyle — see
 * `resolvePlanetActivity`.
 */
export type PlanetActivitySetting = "off" | "stable" | "race";

/**
 * The offered planet resources settings, in the order the start screen
 * renders them: off, stable, race. Which one the app preselects is independent of
 * the render order — see `DEFAULT_PLANET_ACTIVITY`.
 */
export const PLANET_ACTIVITY_SETTINGS: readonly PlanetActivitySetting[] = [
  "off",
  "stable",
  "race",
];

/** The app's default: race. */
export const DEFAULT_PLANET_ACTIVITY: PlanetActivitySetting = "race";

/**
 * Whether a value is one of the offered planet resources settings.
 * `startingGameState` uses it to validate a planet resources setting that
 * arrives from outside the type system, such as an options object built by
 * a caller other than the start screen.
 */
export function isPlanetActivitySetting(
  value: unknown,
): value is PlanetActivitySetting {
  return (PLANET_ACTIVITY_SETTINGS as readonly unknown[]).includes(value);
}

/**
 * The planet resources setting a game actually starts with, given the node
 * playstyle it starts under and the setting remembered on the start screen
 * (steal.md §10 applies only under steal): the remembered setting under
 * steal, `"off"` under continuous, planet or dedicated regardless of what
 * the start screen's group last held it at.
 */
export function resolvePlanetActivity(
  nodePlaystyle: NodePlaystyle,
  remembered: PlanetActivitySetting,
): PlanetActivitySetting {
  return nodePlaystyle === "steal" ? remembered : "off";
}
