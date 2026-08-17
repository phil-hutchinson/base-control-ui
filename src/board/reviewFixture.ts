// TEMPORARY review scaffolding (story 00000003, added in step 8, deleted in
// step 11) that puts all four site states, and a ship standing on one of
// each, on screen at the same time, so the manual gates that follow can
// judge every appearance in one sitting. Board.tsx reads from here instead
// of the real rules-layer starting state for exactly the steps in between.
//
// The arrangement below is NOT a legal game state: rules.md §8.1 says
// nothing is charged or depleted at the start of a real game, and every ship
// starts in a bay, never on a site. Nothing in src/rules/ may import this
// module.

import { type Square, squareAt, squareName } from "../rules/board";
import { startingSideAt, type Side } from "../rules/fleet";
import type { SiteState } from "../rules/sites";

const REVIEW_SITE_STATE_BY_NAME: ReadonlyMap<string, SiteState> = new Map([
  // Charged
  [squareName(squareAt("H", 8)), "charged"],
  // Depleted
  [squareName(squareAt("H", 4)), "depleted"],
  [squareName(squareAt("H", 12)), "depleted"],
  // Active
  [squareName(squareAt("E", 5)), "active"],
  [squareName(squareAt("K", 5)), "active"],
  [squareName(squareAt("E", 11)), "active"],
  [squareName(squareAt("K", 11)), "active"],
  // Dormant
  [squareName(squareAt("F", 2)), "dormant"],
  [squareName(squareAt("J", 2)), "dormant"],
  [squareName(squareAt("B", 4)), "dormant"],
  [squareName(squareAt("N", 4)), "dormant"],
  [squareName(squareAt("D", 8)), "dormant"],
  [squareName(squareAt("L", 8)), "dormant"],
  [squareName(squareAt("B", 12)), "dormant"],
  [squareName(squareAt("N", 12)), "dormant"],
  [squareName(squareAt("F", 14)), "dormant"],
  [squareName(squareAt("J", 14)), "dormant"],
]);

/** The site state to draw at a square, for this review fixture only. */
export function reviewSiteStateAt(square: Square): SiteState | undefined {
  return REVIEW_SITE_STATE_BY_NAME.get(squareName(square));
}

// Four extra ships, one per state, alternating sides, standing on sites so
// the gate can judge whether a marker still reads under a ship. These are in
// addition to the fourteen ships in their bays.
const REVIEW_SHIP_BY_NAME: ReadonlyMap<string, Side> = new Map([
  [squareName(squareAt("H", 8)), "green"], // charged
  [squareName(squareAt("H", 4)), "red"], // depleted
  [squareName(squareAt("E", 5)), "green"], // active
  [squareName(squareAt("B", 4)), "red"], // dormant
]);

/**
 * The ship (if any) to draw at a square: the fourteen starting ships in
 * their bays, plus the four extra review ships standing on sites.
 */
export function reviewOccupantAt(square: Square): Side | undefined {
  return startingSideAt(square) ?? REVIEW_SHIP_BY_NAME.get(squareName(square));
}
