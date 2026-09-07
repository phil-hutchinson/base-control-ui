// The three states a node can be in (rules.md §8.1), and the opening deal
// (rules.md §8.1): it draws the four charged squares, deals each at
// baseline (no countdown), and places the three inactive nodes by the same
// refill procedure a later charge uses. An inactive node's `level` carries
// its priority instead (`nodeQueue.ts` owns everything about that); a
// charged or depleted node's `level` is plies remaining in its countdown,
// owned by `countdown.ts`.

import { ALL_SQUARES, type Square, squareName } from "./board";
import { drawNodeSquare } from "./nodePlacement";
import { refillQueue } from "./nodeQueue";

/** The three states a node can be in (rules.md §8.1). */
export type NodeState = "inactive" | "charged" | "depleted";

/**
 * How many nodes the board keeps charged at all times (rules.md §8.1,
 * §8.2). The shortfall against this many is filled every turn, from the
 * three inactive nodes.
 */
export const TARGET_CHARGED_NODES = 4;

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
 * 1. Draw `TARGET_CHARGED_NODES` (4) squares, one at a time, via
 *    `drawNodeSquare`, each recomputed against the squares placed so far —
 *    so each placement respects the ones before it — and drawn uniformly,
 *    since at the deal no node has any priority to weight by. Each is
 *    dealt `charged` at **level 0** — no countdown, exactly like any node
 *    charged during play (rules.md §8.1, §8.3) — so this draws nothing
 *    further for them.
 * 2. Place the three inactive nodes by one call to `refillQueue` (§8.2),
 *    against the board as the four charged squares leave it — the same
 *    procedure a later charge's refill uses, so the trio is spread apart
 *    from the charged nodes and from each other and dealt priorities 1, 2
 *    and 3 at random.
 *
 * That is 4 + 4 = 8 seed steps before green's first turn. Nothing is dealt
 * `depleted`.
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
    const [square, nextSeed] = drawNodeSquare(
      chargedSquares,
      shipSquares,
      workingSeed,
    );
    chargedSquares.push(square);
    workingSeed = nextSeed;
  }

  const chargedNames = new Set(chargedSquares.map(squareName));
  const orderedChargedSquares = ALL_SQUARES.filter((square) =>
    chargedNames.has(squareName(square)),
  );

  const nodes: Record<string, { state: NodeState; level: number }> = {};

  for (const square of orderedChargedSquares) {
    nodes[squareName(square)] = { state: "charged", level: 0 };
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
