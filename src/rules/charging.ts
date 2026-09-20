// §8.2's charging step, run as step 4 of the end-of-turn sequence (§8.6):
// whatever shortfall there is against the state's own charged-node count is
// filled from the three inactive nodes, top-down by priority — the
// priority-3 node first, then the 2, then the 1 — with no draw, no
// weighting and no seed movement at all: a player who can see the
// priorities already knows which node charges next. The shortfall can
// never exceed two — at most one countdown starts per turn, so at most one
// node expires per turn, plus at most one node a player can walk off in the
// same turn — which the three-node queue always covers, so this step never
// needs to place a node any other way.

import { squareName, type Square } from "./board";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
} from "./gameState";
import {
  inactivePriority,
  orderByPriorityDescending,
  type NodePriority,
} from "./nodeQueue";

/**
 * A node went from inactive to charged because it was at the front of the
 * queue (rules.md §8.2). `priority` reports the priority the node was last
 * drawn with — the priority a player last saw it holding on the board — a
 * fact the state no longer carries once the node is charged, since its
 * status becomes `{ state: "charged", level: 0 }`. Under the planet or
 * dedicated settings a landing can rotate the queue mid-ply, before this
 * node ever charges (`ply.ts`'s `rotateForLanding`); this is the priority
 * from before that rotation, not the one the node holds by the time it
 * charges. Under continuous nothing rotates mid-ply, so the two always
 * agree.
 */
export interface NodeChargedEffect {
  readonly type: "node-charged";
  readonly square: Square;
  readonly priority: NodePriority;
}

/** The state resulting from charging, and the effects it produced. */
export interface ChargingResult {
  readonly state: GameState;
  readonly effects: readonly NodeChargedEffect[];
}

/**
 * Charges as many of the three inactive nodes as the shortfall against
 * `state.chargedNodeCount` calls for, highest priority first (rules.md
 * §8.2, §8.6 step 4). A charged node starts at baseline with no countdown,
 * and a newly charged node never has a ship on it already, since no node
 * ever appears under one. The queue order is decided entirely by
 * `orderByPriorityDescending` and consumes no randomness at all.
 * `state.randomSeed` is never touched here.
 *
 * `reportedPriorities`, if given, overrides only what a charging node's
 * effect *reports* as its priority, keyed by square name — never which node
 * charges or in what order, which are always decided from `state` itself.
 * It exists so a caller can pass in the priorities from before a mid-ply
 * rotation (`ply.ts`'s `rotateForLanding`), so the effect names the priority
 * a player last saw rather than the one the rotation left behind.
 */
export function runCharging(
  state: GameState,
  reportedPriorities?: Readonly<Record<string, NodePriority>>,
): ChargingResult {
  const squares = nodeSquares(state);
  const chargedCount = squares.filter(
    (square) => nodeStateAt(state, square) === "charged",
  ).length;
  const shortfall = Math.max(0, state.chargedNodeCount - chargedCount);

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

  for (const { square, priority } of toCharge) {
    const name = squareName(square);
    workingState = {
      ...workingState,
      nodes: {
        ...workingState.nodes,
        [name]: { state: "charged", level: 0 },
      },
    };
    const reportedPriority = reportedPriorities?.[name] ?? priority;
    effects.push({ type: "node-charged", square, priority: reportedPriority });
  }

  return { state: workingState, effects };
}
