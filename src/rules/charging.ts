// §8.2's charging step, run as step 4 of the end-of-turn sequence (§8.6):
// whatever shortfall there is against `TARGET_CHARGED_NODES` is filled from
// the three inactive nodes, top-down by priority — the priority-3 node
// first, then the 2, then the 1 — with no draw, no weighting and no seed
// movement at all: a player who can see the priorities already knows which
// node charges next. If the shortfall is four — all four charged nodes ran
// out on the same turn, so the three-node queue cannot cover it — one
// further node is placed directly as charged, at a square drawn uniformly
// from the widened pool (§3.2, §8.2). That is the only draw this step ever
// makes, and it happens at most once: the shortfall can never exceed four.

import { type Square, squareName } from "./board";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
} from "./gameState";
import { legalNodePool, drawUniformSquare } from "./nodePlacement";
import { inactivePriority, orderByPriorityDescending } from "./nodeQueue";
import { TARGET_CHARGED_NODES } from "./nodes";

/** A node went from inactive to charged because it was at the front of the queue (rules.md §8.2). */
export interface NodeChargedEffect {
  readonly type: "node-charged";
  readonly square: Square;
}

/**
 * A fourth charged node appeared out of nowhere, already charged at zero
 * drain, because all four charged nodes ran out on the same turn and the
 * three-node queue could cover only three of the four (rules.md §8.2). It
 * never spent a turn inactive and never carried a priority.
 */
export interface NodeAppearedChargedEffect {
  readonly type: "node-appeared-charged";
  readonly square: Square;
}

/** The state resulting from charging, and the effects it produced. */
export interface ChargingResult {
  readonly state: GameState;
  readonly effects: readonly (NodeChargedEffect | NodeAppearedChargedEffect)[];
}

/**
 * Charges as many of the three inactive nodes as the shortfall against
 * `TARGET_CHARGED_NODES` calls for, highest priority first (rules.md §8.2,
 * §8.6 step 4). Charging does not look at occupancy: a node with a ship
 * standing on it charges like any other. The queue order is decided
 * entirely by `orderByPriorityDescending` and consumes no randomness at
 * all. If the shortfall is four — the one turn all four charged nodes ran
 * out at once — one further node is placed directly as charged, at a
 * square drawn uniformly from the widened pool, consuming exactly one seed
 * step; `state.randomSeed` moves only in that case.
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
  const effects: (NodeChargedEffect | NodeAppearedChargedEffect)[] = [];

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

  if (shortfall === TARGET_CHARGED_NODES) {
    const occupiedSquares = nodeSquares(workingState);
    const shipSquares = workingState.ships.map((ship) => ship.square);
    const widenedPool = legalNodePool(occupiedSquares, shipSquares, "widened");
    const [square, nextSeed] = drawUniformSquare(
      widenedPool,
      workingState.randomSeed,
    );
    const name = squareName(square);
    workingState = {
      ...workingState,
      nodes: { ...workingState.nodes, [name]: { state: "charged", level: 0 } },
      randomSeed: nextSeed,
    };
    effects.push({ type: "node-appeared-charged", square });
  }

  return { state: workingState, effects };
}
