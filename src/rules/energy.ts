// §8.4: which charged nodes a side is standing on. A player collects one
// energy for each charged node they hold and nothing subtracts it —
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
