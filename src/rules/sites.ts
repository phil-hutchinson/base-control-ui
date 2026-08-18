// The seventeen site squares (rules.md §3.2), the four states a site can be
// in (rules.md §8.1), and the two nine-ply clocks that govern how long a
// site stays charged (§8.3) and how long it stays depleted (§8.6).

import { type Square, squareAt, squareName } from "./board";

/**
 * The seventeen site squares, in the row order rules.md §3.2 lists them
 * (bottom to top, left to right within a row).
 */
export const SITES: readonly Square[] = [
  // Row 2
  squareAt("F", 2),
  squareAt("J", 2),
  // Row 4
  squareAt("B", 4),
  squareAt("H", 4),
  squareAt("N", 4),
  // Row 5
  squareAt("E", 5),
  squareAt("K", 5),
  // Row 8
  squareAt("D", 8),
  squareAt("H", 8),
  squareAt("L", 8),
  // Row 11
  squareAt("E", 11),
  squareAt("K", 11),
  // Row 12
  squareAt("B", 12),
  squareAt("H", 12),
  squareAt("N", 12),
  // Row 14
  squareAt("F", 14),
  squareAt("J", 14),
];

/** The four states a site can be in (rules.md §8.1). */
export type SiteState = "dormant" | "active" | "charged" | "depleted";

/**
 * The five sites that start the game active (rules.md §8.1), transcribed
 * literally in the document's order. The other twelve sites start dormant,
 * and none starts charged or depleted.
 */
export const STARTING_ACTIVE_SITES: readonly Square[] = [
  squareAt("H", 8),
  squareAt("E", 5),
  squareAt("K", 5),
  squareAt("E", 11),
  squareAt("K", 11),
];

const STARTING_ACTIVE_NAMES: ReadonlySet<string> = new Set(
  STARTING_ACTIVE_SITES.map(squareName),
);

const SITE_NAMES: ReadonlySet<string> = new Set(SITES.map(squareName));

/**
 * The state a site is in at the start of the game, or `undefined` if the
 * given square is not a site at all.
 */
export function startingSiteState(square: Square): SiteState | undefined {
  const name = squareName(square);
  if (!SITE_NAMES.has(name)) {
    return undefined;
  }
  return STARTING_ACTIVE_NAMES.has(name) ? "active" : "dormant";
}

/**
 * How many turns a charged node stays charged (rules.md §8.3), counting the
 * turn it was woken on.
 */
export const CHARGED_LIFE_PLIES = 9;

/**
 * How many turns a depleted site cools down for before it returns to the
 * dormant pool (rules.md §8.6), not counting the turn it depleted on.
 */
export const DEPLETED_COOLDOWN_PLIES = 9;

/**
 * Whether a node charged on `enteredOnPly` has finished its nine turns as of
 * `plyNumber` (rules.md §8.3). The charged clock counts the turn it was
 * woken on, so this is true from `enteredOnPly + CHARGED_LIFE_PLIES - 1`
 * onwards.
 */
export function hasChargedNodeFinished(
  enteredOnPly: number,
  plyNumber: number,
): boolean {
  return plyNumber - enteredOnPly + 1 >= CHARGED_LIFE_PLIES;
}

/**
 * Whether a site depleted on `enteredOnPly` has finished cooling down as of
 * `plyNumber` (rules.md §8.6). The cooldown does not count the turn the site
 * depleted on, so this is true from `enteredOnPly + DEPLETED_COOLDOWN_PLIES`
 * onwards.
 */
export function hasDepletedSiteFinishedCooling(
  enteredOnPly: number,
  plyNumber: number,
): boolean {
  return plyNumber - enteredOnPly >= DEPLETED_COOLDOWN_PLIES;
}
