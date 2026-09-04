// §8.2's charge draw, run as step 4 of the end-of-turn sequence (§8.6): as
// many inactive nodes as it takes to bring the charged count back to
// `TARGET_CHARGED_NODES` are charged, one at a time, weighted by each
// candidate's pressure (its `level`) rather than drawn uniformly — a node
// that has waited longer is likelier to be picked. Pressure is never below
// 1, so no inactive node can ever be excluded outright, and the pool's total
// weight is always positive whenever the pool is non-empty. The shortfall
// is computed here, not handed in by the caller — it can exceed the number
// of nodes that ran out this very ply, if the board was already short from
// an earlier ply that could not fill it. Running short is a legal outcome:
// with no inactive node left to draw from, this simply stops and leaves the
// board below its target until a future ply's draw can close the gap.

import { type Square, squareName } from "./board";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
} from "./gameState";
import { drawWeightedIndex } from "./random";
import { TARGET_CHARGED_NODES } from "./nodes";

/** A node went from inactive to charged because the board's end-of-turn draw picked it (rules.md §8.2). */
export interface NodeChargedEffect {
  readonly type: "node-charged";
  readonly square: Square;
}

/** The state resulting from the charge draw, and the effects it produced. */
export interface ChargeDrawResult {
  readonly state: GameState;
  readonly effects: readonly NodeChargedEffect[];
}

/**
 * Draws nodes to charge from the inactive pool until the charged count
 * reaches `TARGET_CHARGED_NODES` or the pool runs out, whichever comes first
 * (rules.md §8.2, §8.6 step 4). The pool is every node currently `inactive`,
 * collected by walking the board in board order; occupied inactive nodes are
 * drawn like any other. Each node's weight is its own
 * pressure (its `level`), so a node that has waited longer is likelier to be
 * picked. Each draw removes its node from the pool — so the next draw's
 * weights are the remaining nodes' pressures — and advances
 * `state.randomSeed` before the next one, exactly as the 0.10 uniform
 * replacement draw did — so a recorded game still replays exactly. The seed
 * does not move at all if nothing is drawn.
 */
export function runChargeDraw(state: GameState): ChargeDrawResult {
  const squares = nodeSquares(state);
  const chargedCount = squares.filter(
    (square) => nodeStateAt(state, square) === "charged",
  ).length;
  let shortfall = TARGET_CHARGED_NODES - chargedCount;

  let pool = squares.filter(
    (square) => nodeStateAt(state, square) === "inactive",
  );

  let workingState = state;
  const effects: NodeChargedEffect[] = [];

  while (shortfall > 0 && pool.length > 0) {
    const weights = pool.map(
      (square) => nodeStatusAt(workingState, square)?.level ?? 0,
    );
    const [index, nextSeed] = drawWeightedIndex(
      workingState.randomSeed,
      weights,
    );
    const drawn = pool[index];
    const name = squareName(drawn);

    workingState = {
      ...workingState,
      nodes: {
        ...workingState.nodes,
        [name]: { state: "charged", level: 0 },
      },
      randomSeed: nextSeed,
    };
    effects.push({ type: "node-charged", square: drawn });

    pool = pool.filter((_, poolIndex) => poolIndex !== index);
    shortfall -= 1;
  }

  return { state: workingState, effects };
}
