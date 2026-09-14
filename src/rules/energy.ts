// §8.4: which charged nodes a side is standing on, and what a turn's
// collection is worth under the game's chosen scoring setting. Nothing
// subtracts energy — depleted nodes are the trap's concern (`trap.ts`), not
// an energy one. Nothing about the end-of-turn sequence, effects or running
// totals lives here.

import { type Square, squareName } from "./board";
import {
  type GameState,
  nodeSquares,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import type { Side } from "./fleet";
import type { ScoringSetting } from "./scoring";

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

/**
 * What a whole turn collects for holding `nodesHeld` charged nodes, under
 * `scoring` (rules.md §8.4). Under `"simple"` this is `nodesHeld` itself —
 * one energy per node. Under `"bonus"` it is the triangular total
 * `nodesHeld × (nodesHeld + 1) / 2`, because each node held is worth one
 * more than the node before it: 1, 3, 6, 10, 15 for one through five.
 *
 * This is the whole turn's payout, not a per-node rate — under bonus there
 * is no meaningful "which node paid the 3". It is written as the formula
 * rather than a lookup table: a table would need a bound to maintain, and
 * the largest count the board can produce has already changed once.
 */
export function energyForNodesHeld(
  nodesHeld: number,
  scoring: ScoringSetting,
): number {
  if (scoring === "simple") {
    return nodesHeld;
  }
  return (nodesHeld * (nodesHeld + 1)) / 2;
}
