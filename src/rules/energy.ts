// §8.4 in both directions: the table, what a side is standing on, and the
// price either way — collecting for charged nodes held, and paying for
// dormant sites occupied. Nothing about the end-of-turn sequence, effects or
// running totals lives here.

import { type Square, squareName } from "./board";
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import { SITES } from "./sites";
import { STARTING_FLEET, type Side } from "./fleet";

/**
 * §8.4's table: the energy paid for a count of charged nodes held, and the
 * energy taken for a count of dormant sites occupied, indexed by that
 * count. The same table prices both directions.
 */
const ENERGY_BY_NODES_HELD: readonly number[] = [0, 1, 3, 6, 10, 15];

/**
 * The most dormant sites the table's penalty ever prices, regardless of how
 * many a side actually occupies (§8.4). The most a turn can pay is 15 (five
 * charged nodes), so the most a turn can cost is capped here at 15 too, and
 * neither half of §8.4 can outrun the other.
 */
const MAX_DORMANT_SITES_PRICED = ENERGY_BY_NODES_HELD.length - 1;

/**
 * The number of ships one side starts with, and so the most sites of that
 * side's it could ever be standing on at once.
 */
const SHIPS_PER_SIDE = STARTING_FLEET.filter(
  (entry) => entry.side === "green",
).length;

/**
 * The energy paid for holding `nodesHeld` charged nodes (rules.md §8.4).
 * Throws a `RangeError` outside 0–5: the board never charges more than five
 * sites at once (§8.1, §8.2), so a sixth held node is a bug in the caller,
 * not a case to absorb.
 */
export function energyForNodesHeld(nodesHeld: number): number {
  if (
    !Number.isInteger(nodesHeld) ||
    nodesHeld < 0 ||
    nodesHeld >= ENERGY_BY_NODES_HELD.length
  ) {
    throw new RangeError(
      `energyForNodesHeld: nodesHeld must be an integer from 0 to ${
        ENERGY_BY_NODES_HELD.length - 1
      }, got ${nodesHeld}`,
    );
  }
  return ENERGY_BY_NODES_HELD[nodesHeld];
}

/**
 * The charged nodes `side` is standing on right now, in `SITES` order. A
 * node counts only if one of that side's ships occupies its square **and**
 * the square's site state is `charged` (rules.md §8.4) — an active or
 * dormant site pays nothing, and neither does a node a ship merely flew
 * over, which this cannot see because it reads the state at the moment
 * asked.
 */
export function chargedNodesHeldBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return SITES.filter((site) => {
    if (siteStateAt(state, site) !== "charged") {
      return false;
    }
    const ship = ships.get(squareName(site));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * The dormant sites `side` is standing on right now, in `SITES` order. A
 * site counts only if one of that side's ships occupies its square **and**
 * the square's site state is `dormant` (rules.md §8.4) — an active or
 * charged site costs nothing, and neither does a dormant site a ship merely
 * flew over, which this cannot see because it reads the state at the moment
 * asked.
 */
export function dormantSitesOccupiedBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return SITES.filter((site) => {
    if (siteStateAt(state, site) !== "dormant") {
      return false;
    }
    const ship = ships.get(squareName(site));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * The energy taken for standing on `dormantSites` dormant sites (rules.md
 * §8.4), read off the same table `energyForNodesHeld` uses. Unlike a
 * charged count, a dormant count has no board-imposed ceiling — up to
 * twelve of the seventeen sites can be dormant at once, and a side has
 * seven ships — so this is an ordinary state of the game, not a bug: the
 * count is **clamped** to `MAX_DORMANT_SITES_PRICED` before it is priced,
 * so six or seven dormant sites cost the same as five.
 *
 * Still throws a `RangeError`, but only for a count that is genuinely
 * impossible: negative, fractional, or larger than the number of ships a
 * side has.
 */
export function energyForDormantSites(dormantSites: number): number {
  if (
    !Number.isInteger(dormantSites) ||
    dormantSites < 0 ||
    dormantSites > SHIPS_PER_SIDE
  ) {
    throw new RangeError(
      `energyForDormantSites: dormantSites must be an integer from 0 to ${SHIPS_PER_SIDE}, got ${dormantSites}`,
    );
  }
  const priced = Math.min(dormantSites, MAX_DORMANT_SITES_PRICED);
  return ENERGY_BY_NODES_HELD[priced];
}
