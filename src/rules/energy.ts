// §8.4: the table and the charged nodes a side is standing on. A player
// collects energy for the charged nodes they hold and nothing subtracts it —
// depleted nodes are the trap's concern (`trap.ts`), not an energy one.
// Nothing about the end-of-turn sequence, effects or running totals lives
// here.

import { type Square, squareName } from "./board";
import {
  type GameState,
  nodeSquares,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import type { Side } from "./fleet";

/**
 * §8.4's table: the energy paid for a count of charged nodes held, indexed
 * by that count.
 */
const ENERGY_BY_NODES_HELD: readonly number[] = [0, 1, 3, 6, 10];

/**
 * The energy paid for holding `nodesHeld` charged nodes (rules.md §8.4).
 * Throws a `RangeError` outside 0–4: the board never charges more than four
 * nodes at once (§8.1, §8.2), so a fifth held node is a bug in the caller,
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
 * The number of pips the HUD's depleted-node row draws
 * (`ScoreDisplay.tsx`), independent of how many depleted nodes a side is
 * actually occupying. No longer priced against anything — nothing subtracts
 * energy any more — this constant survives only for the row's own sizing.
 */
export const MAX_DEPLETED_NODES_PRICED = ENERGY_BY_NODES_HELD.length - 1;

/**
 * The charged nodes `side` is standing on right now, in board order. A node
 * counts only if one of that side's ships occupies its square **and** the
 * square's node state is `charged` (rules.md §8.4) — an inactive or depleted
 * node pays nothing, and neither does a node a ship merely flew over, which
 * this cannot see because it reads the state at the moment asked.
 */
export function chargedNodesHeldBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return nodeSquares(state).filter((node) => {
    if (nodeStateAt(state, node) !== "charged") {
      return false;
    }
    const ship = ships.get(squareName(node));
    return ship !== undefined && ship.side === side;
  });
}
