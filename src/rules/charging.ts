// §8.2's charging step, run as step 4 of the end-of-turn sequence (§8.6):
// whatever shortfall there is against `TARGET_CHARGED_NODES` is filled from
// the three inactive nodes, top-down by priority — the priority-3 node
// first, then the 2, then the 1 — with no draw, no weighting and no seed
// movement at all: a player who can see the priorities already knows which
// node charges next. The shortfall can never exceed two — at most one
// countdown starts per turn, so at most one node expires per turn, plus at
// most one node a player can walk off in the same turn — which the
// three-node queue always covers, so this step never needs to place a node
// any other way.

import { squareName, type Square } from "./board";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
} from "./gameState";
import { inactivePriority, orderByPriorityDescending } from "./nodeQueue";
import { TARGET_CHARGED_NODES } from "./nodes";

/** A node went from inactive to charged because it was at the front of the queue (rules.md §8.2). */
export interface NodeChargedEffect {
  readonly type: "node-charged";
  readonly square: Square;
}

/** The state resulting from charging, and the effects it produced. */
export interface ChargingResult {
  readonly state: GameState;
  readonly effects: readonly NodeChargedEffect[];
}

/**
 * Charges as many of the three inactive nodes as the shortfall against
 * `TARGET_CHARGED_NODES` calls for, highest priority first (rules.md §8.2,
 * §8.6 step 4). A charged node starts at baseline with no countdown, and a
 * newly charged node never has a ship on it already, since no node ever
 * appears under one. The queue order is decided entirely by
 * `orderByPriorityDescending` and consumes no randomness at all.
 * `state.randomSeed` is never touched here.
 */
export function runCharging(state: GameState): ChargingResult {
  const squares = nodeSquares(state);
  const chargedCount = squares.filter(
    (square) => nodeStateAt(state, square) === "charged",
  ).length;
  const shortfall = Math.max(0, TARGET_CHARGED_NODES - chargedCount);

  const inactiveNodes = squares
    .filter((square) => nodeStateAt(state, square) === "inactive")
    .map((square) => {
      const status = nodeStatusAt(state, square);
      return {
        square,
        priority: status !== undefined ? inactivePriority(status) : 1,
      };
    });
  const toCharge = orderByPriorityDescending(inactiveNodes).slice(0, shortfall);

  let workingState = state;
  const effects: NodeChargedEffect[] = [];

  for (const { square } of toCharge) {
    const name = squareName(square);
    workingState = {
      ...workingState,
      nodes: {
        ...workingState.nodes,
        [name]: { state: "charged", level: 0 },
      },
    };
    effects.push({ type: "node-charged", square });
  }

  return { state: workingState, effects };
}
