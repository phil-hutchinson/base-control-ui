// The three states a node can be in (rules.md §8.1), and how a node's
// single `level` number moves within each state: a charged node's capacity
// and its two drawn drain distributions (§8.3), and a depleted node's drawn
// recovery distribution (§8.2). An inactive node's `level` carries its
// priority instead (`nodeQueue.ts` owns everything about that). Also the
// opening deal (§8.1), which draws the four charged squares and their
// opening drains, then places the three inactive nodes by the same refill
// procedure a later charge uses.

import { ALL_SQUARES, type Square, squareName } from "./board";
import { legalNodePool } from "./nodePlacement";
import { refillQueue } from "./nodeQueue";
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
 * How many nodes the board keeps charged at all times (rules.md §8.1,
 * §8.2). Unlike the pre-0.26 aim this now always holds exactly: the
 * shortfall against this many is filled every turn, from the three
 * inactive nodes and, if that is not enough, by the direct fourth
 * placement.
 */
export const TARGET_CHARGED_NODES = 4;

/** One outcome of a weighted draw: an amount, and its share of the total weight. */
export interface WeightedAmount {
  readonly amount: number;
  readonly weight: number;
}

/**
 * The drain a dealt node opens at, drawn once for each of the four nodes
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
 * on and a seed in, seven node statuses keyed by `squareName` — four charged
 * and three inactive — and the next seed out. `startingGameState` builds
 * the fleet first so it can pass the ships' squares here, which are
 * excluded from where a node may appear — building it consumes no
 * randomness, so the seeded stream is unaffected.
 *
 * The draw order is fixed and must not change, because a recorded game
 * replays by replaying the seed:
 *
 * 1. Draw `TARGET_CHARGED_NODES` (4) squares, one at a time, each from
 *    `legalNodePool` recomputed against the squares placed so far — so each
 *    placement respects the ones before it — and drawn uniformly via
 *    `drawIndex`, since at the deal no node has any priority to weight by.
 * 2. Walk those four squares in board order, drawing one `drawTableAmount`
 *    call each from `OPENING_DRAIN_TABLE`. The result becomes the node's
 *    `level`; its state is `charged`.
 * 3. Place the three inactive nodes by one call to `refillQueue` (§8.2),
 *    against the board as the four charged squares leave it — the same
 *    procedure a later charge's refill uses, so the trio is spread apart
 *    from the charged nodes and from each other and dealt priorities 1, 2
 *    and 3 at random.
 *
 * That is 4 + 4 + 4 = 12 seed steps before green's first turn. Nothing is
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
  const chargedSquares: Square[] = [];
  let workingSeed = seed;

  for (let count = 0; count < TARGET_CHARGED_NODES; count++) {
    const pool = legalNodePool(chargedSquares, shipSquares);
    const [index, nextSeed] = drawIndex(workingSeed, pool.length);
    chargedSquares.push(pool[index]);
    workingSeed = nextSeed;
  }

  const chargedNames = new Set(chargedSquares.map(squareName));
  const orderedChargedSquares = ALL_SQUARES.filter((square) =>
    chargedNames.has(squareName(square)),
  );

  const nodes: Record<string, { state: NodeState; level: number }> = {};

  for (const square of orderedChargedSquares) {
    const [level, nextSeed] = drawTableAmount(workingSeed, OPENING_DRAIN_TABLE);
    nodes[squareName(square)] = { state: "charged", level };
    workingSeed = nextSeed;
  }

  const [inactiveNodes, seedAfterRefill] = refillQueue(
    chargedSquares,
    chargedSquares,
    shipSquares,
    workingSeed,
  );
  for (const { square, priority } of inactiveNodes) {
    nodes[squareName(square)] = { state: "inactive", level: priority };
  }
  workingSeed = seedAfterRefill;

  return [nodes, workingSeed];
}

/**
 * How far a node's `level` has travelled through its state's own artwork
 * cycle, clamped to [0, 1]: a charged node's drain against `NODE_CAPACITY`,
 * and a depleted node's remaining drain against `NODE_CAPACITY` (so a node
 * ended early begins its depleted spell already part travelled). An
 * inactive node has no cycle position of its own any more — its artwork is
 * drawn straight from its priority (`../board/NodeMarker.tsx`) — so this
 * only ever takes `"charged"` or `"depleted"`.
 */
export function nodeCyclePosition(
  state: "charged" | "depleted",
  level: number,
): number {
  const denominator = NODE_CAPACITY;
  let raw: number;

  if (state === "charged") {
    raw = level / denominator;
  } else {
    raw = 1 - level / denominator;
  }

  return Math.min(1, Math.max(0, raw));
}
