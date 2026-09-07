// The three inactive nodes' queue (rules.md §8.2): the priority each one
// carries, the refill that replaces all three at once when a charge sweeps
// them, and the rotation that shifts them one step on a turn that charges
// nothing. A pure leaf module — it knows nothing about `GameState`, only
// squares, priorities and the seeded stream — so it can be shared by the
// opening deal (`nodes.ts`) and end-of-turn charging (`charging.ts`,
// `endOfTurn.ts`) without either importing the other.
//
// A refill's four seed steps, in this fixed order, so a recorded game
// replays exactly:
//
// 1. The first square, drawn by `drawWeightedNodeSquare` over the strict
//    pool (`legalNodePool`'s default) — all six of §3.2's constraints.
// 2. The second square, drawn the same way over the widened pool
//    (constraint 4 lifted), computed against a board that already includes
//    the first square, so both the adjacency constraint and the weighting
//    see it.
// 3. The third square, the same again, seeing the first two.
// 4. The priorities: one `drawIndex` over the six entries of
//    `PRIORITY_PERMUTATIONS`, applied to the three squares in the order
//    they were drawn.

import type { Square } from "./board";
import { drawWeightedNodeSquare, legalNodePool } from "./nodePlacement";
import { drawIndex } from "./random";

/**
 * The priority an inactive node carries (rules.md §8.2): one, two or
 * three, one each among the three at any moment, never a repeat.
 */
export type NodePriority = 1 | 2 | 3;

/** How many nodes the board keeps inactive at all times (rules.md §8.1, §8.2). */
export const INACTIVE_NODE_COUNT = 3;

/** The priority that charges next (rules.md §8.2). */
export const TOP_NODE_PRIORITY: NodePriority = 3;

/**
 * The six orderings of (1, 2, 3), in lexicographic order — the table a
 * refill's priority draw picks one row from (rules.md §8.2). Written out
 * rather than shuffled, so dealing the three priorities is a single
 * `drawIndex` call and the possible outcomes are something a test can
 * assert against directly rather than trust to a loop's direction.
 */
export const PRIORITY_PERMUTATIONS: readonly (readonly NodePriority[])[] = [
  [1, 2, 3],
  [1, 3, 2],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  [3, 2, 1],
];

/** One inactive node a refill has just dealt: where it is, and the priority it opens at. */
export interface InactiveNodeDraw {
  readonly square: Square;
  readonly priority: NodePriority;
}

/**
 * Draws a fresh trio of inactive nodes (rules.md §8.2): three squares, one
 * at a time from a pool that widens after the first, spread apart from the
 * squares already holding a charged node and from each other by
 * `drawWeightedNodeSquare`'s weighting, then dealt priorities 1, 2 and 3 in
 * a random order. Consumes exactly four seed steps, in the order stated in
 * this module's header comment, and advances the seed no further.
 *
 * `occupiedNodeSquares` is every square that already holds a node. The
 * caller is expected to have swept the surviving inactive nodes out of it
 * first (§8.6 step 5): a refill never treats its own predecessors as an
 * obstacle. `chargedNodeSquares` is the subset of those that are charged,
 * which is what the weighting spreads the new trio away from — a depleted
 * node contributes no weight, only the adjacency constraint `legalNodePool`
 * already applies to it.
 */
export function refillQueue(
  occupiedNodeSquares: readonly Square[],
  chargedNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
): [nodes: readonly InactiveNodeDraw[], nextSeed: number] {
  const drawnSquares: Square[] = [];
  let workingSeed = seed;

  const strictPool = legalNodePool(occupiedNodeSquares, shipSquares);
  const [firstSquare, seedAfterFirst] = drawWeightedNodeSquare(
    strictPool,
    chargedNodeSquares,
    [],
    workingSeed,
  );
  drawnSquares.push(firstSquare);
  workingSeed = seedAfterFirst;

  for (let draw = 0; draw < 2; draw++) {
    const widenedPool = legalNodePool(
      [...occupiedNodeSquares, ...drawnSquares],
      shipSquares,
      undefined,
      "widened",
    );
    const [square, nextSeed] = drawWeightedNodeSquare(
      widenedPool,
      chargedNodeSquares,
      drawnSquares,
      workingSeed,
    );
    drawnSquares.push(square);
    workingSeed = nextSeed;
  }

  const [permutationIndex, seedAfterPermutation] = drawIndex(
    workingSeed,
    PRIORITY_PERMUTATIONS.length,
  );
  const priorities = PRIORITY_PERMUTATIONS[permutationIndex];

  const nodes = drawnSquares.map((square, index) => ({
    square,
    priority: priorities[index],
  }));

  return [nodes, seedAfterPermutation];
}

/**
 * Rotates one inactive node's priority one step (rules.md §8.2): 1→2, 2→3,
 * 3→1. Applied to every surviving inactive node at the end of a turn on
 * which nothing charged (§8.6 step 5); a freshly refilled trio is never
 * rotated in the turn it was dealt.
 */
export function rotatePriority(priority: NodePriority): NodePriority {
  if (priority === 1) {
    return 2;
  }
  if (priority === 2) {
    return 3;
  }
  return 1;
}

/**
 * Orders a set of inactive nodes by priority, highest first — the order
 * they charge in (rules.md §8.2). The one place any caller should sort by
 * priority, so nothing outside this module needs to write `.level` when it
 * means priority.
 */
export function orderByPriorityDescending<
  T extends { readonly priority: NodePriority },
>(nodes: readonly T[]): readonly T[] {
  return [...nodes].sort((a, b) => b.priority - a.priority);
}
