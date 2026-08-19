// §8.4's payout table and what a side is standing on. Nothing about the
// end-of-turn sequence, effects or running totals lives here.

import { type Square, squareName } from "./board";
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import { SITES } from "./sites";
import type { Side } from "./fleet";

/**
 * §8.4's table: the energy paid for a count of charged nodes held, indexed
 * by that count.
 */
const ENERGY_BY_NODES_HELD: readonly number[] = [0, 1, 3, 6, 10, 15];

/**
 * The energy paid for holding `nodesHeld` charged nodes (rules.md §8.4).
 * Throws a `RangeError` outside 0–5: exactly five sites are active or
 * charged at any moment (§8.1), so a sixth held node is a bug in the caller,
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
 * the square's site state is `charged` (rules.md §8.4) — an active,
 * depleted or dormant site pays nothing, and neither does a node a ship
 * merely flew over, which this cannot see because it reads the state at the
 * moment asked.
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
