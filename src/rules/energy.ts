// §8.4 in both directions: the table, what a side is standing on, and the
// price either way — collecting for charged nodes held, and paying for
// depleted nodes occupied. Nothing about the end-of-turn sequence, effects or
// running totals lives here.

import { type Square, squareName } from "./board";
import { type GameState, shipsBySquare, nodeStateAt } from "./gameState";
import { FIXED_NODE_SQUARES } from "./nodes";
import { MAX_SHIPS_PER_SIDE, type Side } from "./fleet";

/**
 * §8.4's table: the energy paid for a count of charged nodes held, and the
 * energy taken for a count of depleted nodes occupied, indexed by that
 * count. The same table prices both directions.
 */
const ENERGY_BY_NODES_HELD: readonly number[] = [0, 1, 3, 6, 10, 15];

/**
 * The most depleted nodes the table's penalty ever prices, regardless of how
 * many a side actually occupies (§8.4). The most a turn can pay is 15 (five
 * charged nodes), so the most a turn can cost is capped here at 15 too, and
 * neither half of §8.4 can outrun the other.
 */
export const MAX_DEPLETED_NODES_PRICED = ENERGY_BY_NODES_HELD.length - 1;

/**
 * The energy paid for holding `nodesHeld` charged nodes (rules.md §8.4).
 * Throws a `RangeError` outside 0–5: the board never charges more than five
 * nodes at once (§8.1, §8.2), so a sixth held node is a bug in the caller,
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
 * The charged nodes `side` is standing on right now, in `FIXED_NODE_SQUARES`
 * order. A node counts only if one of that side's ships occupies its square
 * **and** the square's node state is `charged` (rules.md §8.4) — an inactive
 * or depleted node pays nothing, and neither does a node a ship merely flew
 * over, which this cannot see because it reads the state at the moment
 * asked.
 */
export function chargedNodesHeldBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return FIXED_NODE_SQUARES.filter((node) => {
    if (nodeStateAt(state, node) !== "charged") {
      return false;
    }
    const ship = ships.get(squareName(node));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * The depleted nodes `side` is standing on right now, in `FIXED_NODE_SQUARES`
 * order. A node counts only if one of that side's ships occupies its square
 * **and** the square's node state is `depleted` (rules.md §8.4) — an
 * inactive or charged node costs nothing, and neither does a depleted node a
 * ship merely flew over, which this cannot see because it reads the state at
 * the moment asked.
 */
export function depletedNodesOccupiedBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return FIXED_NODE_SQUARES.filter((node) => {
    if (nodeStateAt(state, node) !== "depleted") {
      return false;
    }
    const ship = ships.get(squareName(node));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * The energy taken for standing on `depletedNodes` depleted nodes (rules.md
 * §8.4), read off the same table `energyForNodesHeld` uses. Unlike a
 * charged count, a depleted count has no board-imposed ceiling — up to
 * twelve of the seventeen nodes can be depleted at once, and a side has
 * seven ships — so this is an ordinary state of the game, not a bug: the
 * count is **clamped** to `MAX_DEPLETED_NODES_PRICED` before it is priced,
 * so six or seven depleted nodes cost the same as five.
 *
 * Still throws a `RangeError`, but only for a count that is genuinely
 * impossible: negative, fractional, or larger than the number of ships a
 * side has.
 */
export function energyForDepletedNodes(depletedNodes: number): number {
  if (
    !Number.isInteger(depletedNodes) ||
    depletedNodes < 0 ||
    depletedNodes > MAX_SHIPS_PER_SIDE
  ) {
    throw new RangeError(
      `energyForDepletedNodes: depletedNodes must be an integer from 0 to ${MAX_SHIPS_PER_SIDE}, got ${depletedNodes}`,
    );
  }
  const priced = Math.min(depletedNodes, MAX_DEPLETED_NODES_PRICED);
  return ENERGY_BY_NODES_HELD[priced];
}
