// The three states a node can be in (rules.md §8.1), and how a node's
// single `level` number moves within each state: a charged node's capacity
// and its two drawn drain distributions (§8.3), a depleted node's drawn
// recovery distribution (§8.2), and the pressure cap an inactive node's
// level is capped at (§8.2). Also the opening deal (§8.1), which draws the
// whole starting board at once — fifteen squares, from `nodePlacement.ts` —
// and then the level of every one of them from its own opening drain and
// opening pressure tables.

import { ALL_SQUARES, type Square, squareName } from "./board";
import { legalNodePool } from "./nodePlacement";
import { drawIndex, drawWeightedIndex } from "./random";

/** The three states a node can be in (rules.md §8.1). */
export type NodeState = "inactive" | "charged" | "depleted";

/**
 * How much drain a charged node can take before it is spent (rules.md
 * §8.3). A first guess to be play-tested and retuned, not a claim that 60 is
 * right.
 */
export const NODE_CAPACITY = 60;

/**
 * The most pressure an inactive node can build (rules.md §8.2). A first guess
 * to be play-tested and retuned, not a claim that 50 is right.
 */
export const PRESSURE_CAP = 50;

/**
 * The pressure an inactive node starts at when it finishes recovering
 * (rules.md §8.2, §8.6 step 6). The opening deal is the one exception: it
 * draws each inactive node's opening pressure from `OPENING_PRESSURE_TABLE`
 * instead (rules.md §8.1).
 */
export const STARTING_PRESSURE = 1;

/**
 * How many nodes the board aims to keep charged at all times (rules.md
 * §8.1, §8.2). This is an aim, not an invariant: the board charges up to
 * this many inactive nodes at the end of every turn, and falls short when
 * there are not enough inactive nodes to reach it.
 */
export const TARGET_CHARGED_NODES = 5;

/**
 * How many nodes the board carries at all times (rules.md §8.1, §8.2): the
 * opening deal places this many, and one retiring node is always replaced by
 * one new one, so the count never moves.
 */
export const NODE_COUNT = 15;

/** One outcome of a weighted draw: an amount, and its share of the total weight. */
export interface WeightedAmount {
  readonly amount: number;
  readonly weight: number;
}

/**
 * The drain a dealt node opens at, drawn once for each of the five nodes
 * the opening deal charges (rules.md §8.1). Weights are the whole-number
 * percentages the rules table shows, so the two can be read side by side.
 * Average 14. Never exceeds two-thirds of `NODE_CAPACITY`, so the deepest
 * dealt node still has 20 capacity left.
 */
export const OPENING_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 0, weight: 20 },
  { amount: 5, weight: 18 },
  { amount: 10, weight: 15 },
  { amount: 15, weight: 12 },
  { amount: 20, weight: 10 },
  { amount: 25, weight: 8 },
  { amount: 30, weight: 7 },
  { amount: 35, weight: 6 },
  { amount: 40, weight: 4 },
];

/**
 * The pressure a dealt node opens at, drawn once for each of the ten nodes
 * the opening deal leaves inactive (rules.md §8.1). Weights are the
 * whole-number percentages the rules table shows. Average 12.79.
 */
export const OPENING_PRESSURE_TABLE: readonly WeightedAmount[] = [
  { amount: 1, weight: 24 },
  { amount: 5, weight: 20 },
  { amount: 10, weight: 16 },
  { amount: 15, weight: 12 },
  { amount: 20, weight: 9 },
  { amount: 25, weight: 7 },
  { amount: 30, weight: 5 },
  { amount: 40, weight: 4 },
  { amount: 50, weight: 3 },
];

/**
 * How much an empty charged node's drain rises by at the end of a turn no
 * ship stood on it (rules.md §8.3). Weights are the whole-number
 * percentages the rules table shows, so the two can be read side by side.
 * Average 2.1.
 */
export const EMPTY_NODE_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 1, weight: 20 },
  { amount: 2, weight: 50 },
  { amount: 3, weight: 30 },
];

/**
 * How much a held charged node's drain rises by at the end of a turn a ship
 * of either side stood on it (rules.md §8.3). Weights are the whole-number
 * percentages the rules table shows. Average 4.6.
 */
export const HELD_NODE_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 3, weight: 10 },
  { amount: 4, weight: 40 },
  { amount: 5, weight: 30 },
  { amount: 6, weight: 20 },
];

/**
 * How much a depleted node's level falls by at the end of a turn (rules.md
 * §8.2). Weights are the whole-number percentages the rules table shows.
 * Average 6.
 */
export const DEPLETED_RECOVERY_TABLE: readonly WeightedAmount[] = [
  { amount: 4, weight: 10 },
  { amount: 5, weight: 25 },
  { amount: 6, weight: 30 },
  { amount: 7, weight: 25 },
  { amount: 8, weight: 10 },
];

/**
 * Draws one amount from a `WeightedAmount` table, returning the amount and
 * the next seed. Built on `drawWeightedIndex`, so it advances the seed
 * exactly once and shares that function's refusals.
 */
export function drawTableAmount(
  seed: number,
  table: readonly WeightedAmount[],
): [amount: number, nextSeed: number] {
  const [index, nextSeed] = drawWeightedIndex(
    seed,
    table.map((entry) => entry.weight),
  );
  return [table[index].amount, nextSeed];
}

/**
 * Deals a whole opening board (rules.md §8.1): the squares the fleet stands
 * on and a seed in, `NODE_COUNT` (15) node statuses keyed by `squareName`,
 * and the next seed out. `startingGameState` builds the fleet before
 * dealing so it can pass its squares here (see D13 in the implementation
 * plan) — building it consumes no randomness, so the seeded stream is
 * unaffected.
 *
 * The draw order is fixed and must not change, because a recorded game
 * replays by replaying the seed:
 *
 * 1. Draw `TARGET_CHARGED_NODES` (5) squares, one at a time, each from
 *    `legalNodePool` recomputed against the squares placed so far — so each
 *    placement respects the ones before it — and drawn uniformly via
 *    `drawIndex`, since at the deal no node has any pressure to weight by.
 * 2. Draw `NODE_COUNT - TARGET_CHARGED_NODES` (10) more squares the same
 *    way, from the pool the five charged squares have already narrowed.
 *    These are the nodes that open inactive.
 * 3. Walk all fifteen dealt squares in board order (not charged-then-
 *    inactive). For each, one `drawTableAmount` call: the opening drain
 *    table if it was drawn charged in step 1, the opening pressure table
 *    otherwise. The result becomes the node's `level`; its state is
 *    `charged` or `inactive` to match.
 *
 * That is 5 + 10 + 15 = 30 seed steps before green's first turn. Nothing is
 * dealt `depleted`.
 */
export function dealOpeningBoard(
  shipSquares: readonly Square[],
  seed: number,
): [
  nodes: Readonly<
    Record<string, { readonly state: NodeState; readonly level: number }>
  >,
  nextSeed: number,
] {
  const dealtSquares: Square[] = [];
  const chargedNames = new Set<string>();
  let workingSeed = seed;

  for (let count = 0; count < TARGET_CHARGED_NODES; count++) {
    const pool = legalNodePool(dealtSquares, shipSquares);
    const [index, nextSeed] = drawIndex(workingSeed, pool.length);
    const square = pool[index];
    dealtSquares.push(square);
    chargedNames.add(squareName(square));
    workingSeed = nextSeed;
  }

  const inactiveCount = NODE_COUNT - TARGET_CHARGED_NODES;
  for (let count = 0; count < inactiveCount; count++) {
    const pool = legalNodePool(dealtSquares, shipSquares);
    const [index, nextSeed] = drawIndex(workingSeed, pool.length);
    dealtSquares.push(pool[index]);
    workingSeed = nextSeed;
  }

  const dealtNames = new Set(dealtSquares.map(squareName));
  const orderedSquares = ALL_SQUARES.filter((square) =>
    dealtNames.has(squareName(square)),
  );

  const nodes: Record<string, { state: NodeState; level: number }> = {};

  for (const square of orderedSquares) {
    const name = squareName(square);
    const charged = chargedNames.has(name);
    const [level, nextSeed] = drawTableAmount(
      workingSeed,
      charged ? OPENING_DRAIN_TABLE : OPENING_PRESSURE_TABLE,
    );
    nodes[name] = { state: charged ? "charged" : "inactive", level };
    workingSeed = nextSeed;
  }

  return [nodes, workingSeed];
}

/**
 * How far a node's `level` has travelled through its state's own artwork
 * cycle, clamped to [0, 1]: a charged node's drain against `NODE_CAPACITY`,
 * a depleted node's remaining drain against `NODE_CAPACITY` (so a node ended
 * early begins its depleted spell already part travelled), and an inactive node's
 * pressure against `PRESSURE_CAP`, from 1 up. Every state reports a
 * position; none is undefined.
 */
export function nodeCyclePosition(state: NodeState, level: number): number {
  const denominator = state === "inactive" ? PRESSURE_CAP - 1 : NODE_CAPACITY;

  if (denominator <= 0) {
    return 0;
  }

  let raw: number;

  if (state === "charged") {
    raw = level / denominator;
  } else if (state === "depleted") {
    raw = 1 - level / denominator;
  } else {
    raw = (level - 1) / denominator;
  }

  return Math.min(1, Math.max(0, raw));
}
