// Where a new node may appear (rules.md §3.2), and how one is drawn there.
// A pure function of the nodes placed so far and the squares ships occupy —
// used by the opening deal, before a `GameState` exists, by the refill
// procedure in `nodeQueue.ts`, and, under steal, by `steal.ts`'s opening
// deal and its claim and abandon events, all of which read those inputs off
// their own state.

import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareName,
} from "./board";
import { PLANETS, isPlanet } from "./planets";
import { drawIndex, drawWeightedIndex } from "./random";

/**
 * Which pool `legalNodePool` draws from (rules.md §3.2): the ordinary,
 * `"strict"` pool excludes the outer edge and the ring one square in from
 * it; the `"widened"` pool, used for the third square of a refill (section
 * 8.2), excludes neither — constraints 3 and 4 are both lifted together.
 */
export type NodePoolWidth = "strict" | "widened";

/**
 * How many rings of squares around the outer edge the `"strict"` pool
 * excludes (rules.md §3.2, constraints 3 and 4): not the outer edge itself,
 * and not one square in from it. Leaves the 11 x 11 interior C3-M13 on a
 * 15 x 15 board.
 */
const EXCLUDED_EDGE_RINGS = 2;

/**
 * How many rings the `"widened"` pool excludes (rules.md §3.2): constraints
 * 3 and 4 are both lifted together, so no ring around the edge is excluded
 * at all — the outer edge itself is open.
 */
const WIDENED_EXCLUDED_EDGE_RINGS = 0;

function columnIndex(square: Square): number {
  return COLUMN_LETTERS.indexOf(square.column);
}

/**
 * How many rings in from the nearest edge a square sits: 0 on the outer
 * edge, 1 one square in, and so on.
 */
function distanceFromEdge(square: Square): number {
  const colIndex = columnIndex(square);
  const columnDistance = Math.min(
    colIndex,
    COLUMN_LETTERS.length - 1 - colIndex,
  );
  const rowDistance = Math.min(square.row - 1, BOARD_SIZE - square.row);
  return Math.min(columnDistance, rowDistance);
}

function isAdjacentToAnyNode(
  square: Square,
  occupiedNodeSquares: readonly Square[],
): boolean {
  const colIndex = columnIndex(square);
  return occupiedNodeSquares.some(
    (node) =>
      Math.abs(columnIndex(node) - colIndex) <= 1 &&
      Math.abs(node.row - square.row) <= 1,
  );
}

/** Whether a square is orthogonally or diagonally adjacent to any planet. */
function isAdjacentToAnyPlanet(square: Square): boolean {
  const colIndex = columnIndex(square);
  return PLANETS.some(
    (planet) =>
      Math.abs(columnIndex(planet) - colIndex) <= 1 &&
      Math.abs(planet.row - square.row) <= 1,
  );
}

/**
 * The squares a new node may legally occupy (rules.md §3.2), given the
 * squares that already hold a node and the squares ships occupy, in board
 * order.
 *
 * A square qualifies when all six of §3.2's constraints hold:
 *
 * 1. it holds no node already;
 * 2. no ship stands on it;
 * 3. it is not on the outer edge — dropped, together with constraint 4, for
 *    the `"widened"` pool (`poolWidth`), which a refill's third draw uses;
 * 4. it is not one square in from the edge — dropped for the `"widened"`
 *    pool along with constraint 3;
 * 5. it is not orthogonally or diagonally adjacent to a square that holds a
 *    node;
 * 6. it is not a planet, and is not orthogonally or diagonally adjacent to
 *    one.
 *
 * If nothing qualifies, the pool falls back to every square that holds no
 * node, holds no ship and is not a planet — relaxing spacing only, not one
 * constraint dropped at a time. The fallback is the same regardless of
 * `poolWidth`: it is already the whole spacing relaxation at once, so there
 * is nothing left for `poolWidth` to widen. The fallback keeps a node off a
 * planet and off a ship, but, unlike the **strict** pool, does **not** keep
 * it off a planet's neighbours or the board's edge — the widened pool
 * already permits the edge, so the contrast is with the strict pool alone:
 * the fallback may legitimately hand back a square adjacent to a planet.
 * Between constraint 2 and this, a node can never appear beneath a ship. If
 * even the fallback is empty, throws a `RangeError` naming the situation,
 * rather than returning an empty pool for `drawNodeSquare` to fail on with a
 * generic message.
 */
export function legalNodePool(
  occupiedNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  poolWidth: NodePoolWidth = "strict",
): readonly Square[] {
  const nodeNames = new Set(occupiedNodeSquares.map(squareName));
  const shipNames = new Set(shipSquares.map(squareName));
  const excludedEdgeRings =
    poolWidth === "widened" ? WIDENED_EXCLUDED_EDGE_RINGS : EXCLUDED_EDGE_RINGS;

  const pool = ALL_SQUARES.filter((square) => {
    const name = squareName(square);
    return (
      !nodeNames.has(name) &&
      !shipNames.has(name) &&
      distanceFromEdge(square) >= excludedEdgeRings &&
      !isAdjacentToAnyNode(square, occupiedNodeSquares) &&
      !isPlanet(square) &&
      !isAdjacentToAnyPlanet(square)
    );
  });

  if (pool.length > 0) {
    return pool;
  }

  const fallback = ALL_SQUARES.filter((square) => {
    const name = squareName(square);
    return !nodeNames.has(name) && !shipNames.has(name) && !isPlanet(square);
  });

  if (fallback.length === 0) {
    throw new RangeError(
      "legalNodePool: no square is available for a new node — every square that is not a planet or a ship already holds one",
    );
  }

  return fallback;
}

/**
 * Draws one square for a new node from `legalNodePool`'s strict pool,
 * uniformly — a new node has no priority to weight by (rules.md §8.1).
 * Used by the opening deal for its charged squares. Advances the seed
 * exactly once, via `drawIndex`, so a recorded game replays exactly.
 */
export function drawNodeSquare(
  occupiedNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
): [square: Square, nextSeed: number] {
  const pool = legalNodePool(occupiedNodeSquares, shipSquares);
  const [index, nextSeed] = drawIndex(seed, pool.length);
  return [pool[index], nextSeed];
}

/**
 * §3.2's node-spread weight for a candidate square `s`, given the squares
 * holding **charged** nodes (`C`) and the squares already chosen for new
 * inactive nodes in the same refill (`N`):
 *
 *     w(s) = 1 + ( sum over c in C of d(s,c) ) * ( product over n in N of d(s,n) )
 *
 * with `d` the Chebyshev distance. The product over an empty `N` is 1, so a
 * refill's first draw is weighted by distance from the charged nodes alone;
 * each already-placed new node then multiplies the weight down, rather than
 * merely averaging in, so a square close to *any* one of them collapses
 * towards the floor instead of being bought off by distance from another.
 * The leading 1 keeps the weight positive even with no charged nodes at
 * all, which is also what makes the draw uniform in that degenerate case —
 * it is not a fairness floor, it never gives a poorly placed square a
 * meaningful chance once there is anything to weigh it against. Depleted
 * and inactive nodes carry no weight; they are not in `C` or `N` at all.
 */
function nodeSquareWeight(
  square: Square,
  chargedNodeSquares: readonly Square[],
  placedSquares: readonly Square[],
): number {
  const distanceFromCharged = chargedNodeSquares.reduce(
    (total, charged) => total + chebyshevDistance(square, charged),
    0,
  );
  const distanceFromPlaced = placedSquares.reduce(
    (product, placed) => product * chebyshevDistance(square, placed),
    1,
  );
  return 1 + distanceFromCharged * distanceFromPlaced;
}

/**
 * Draws one square from `pool`, weighted by `nodeSquareWeight` — spreading a
 * refill's new inactive nodes apart from the charged nodes and from each
 * other (rules.md §3.2). Advances the seed exactly once, via
 * `drawWeightedIndex`, so a recorded game replays exactly.
 */
export function drawWeightedNodeSquare(
  pool: readonly Square[],
  chargedNodeSquares: readonly Square[],
  placedSquares: readonly Square[],
  seed: number,
): [square: Square, nextSeed: number] {
  const weights = pool.map((square) =>
    nodeSquareWeight(square, chargedNodeSquares, placedSquares),
  );
  const [index, nextSeed] = drawWeightedIndex(seed, weights);
  return [pool[index], nextSeed];
}

/**
 * Steal's node-spread weight for a candidate square `s` (steal.md §6):
 *
 *     w(s) = d(s, a) + min over x in S of d(s, x)
 *
 * `a` is the node's anchor — its charged square when it has one, and its
 * remaining prospective square when it does not — and `S` is every square
 * belonging to any other node, charged or prospective alike; `d` is
 * Chebyshev distance. The first term dominates and can range up to 14: it
 * pushes a node's new prospective square a long way from the node itself, so
 * a steal is a real relocation rather than a shuffle. The second term, about
 * 2 to 5, is a prop-up for a square in an otherwise empty region and is
 * deliberately the smaller of the two. It is 0 when `S` is empty, which only
 * happens for the very first node of the opening deal.
 *
 * A square on the outer edge has its weight halved, so the rim stays
 * available without becoming the likeliest place for a node to end up.
 * `d(s, a)` is never below 2 in the ordinary pool (adjacency is illegal) and
 * never below 1 in the fallback, so the halved weight is always positive and
 * needs no positivity floor of the kind `nodeSquareWeight` carries.
 */
function stealProspectiveWeight(
  square: Square,
  anchor: Square,
  otherNodeSquares: readonly Square[],
): number {
  const distanceFromAnchor = chebyshevDistance(square, anchor);
  const distanceFromOthers =
    otherNodeSquares.length === 0
      ? 0
      : Math.min(
          ...otherNodeSquares.map((other) => chebyshevDistance(square, other)),
        );
  const weight = distanceFromAnchor + distanceFromOthers;
  return distanceFromEdge(square) === 0 ? weight / 2 : weight;
}

/**
 * Draws one square for a node's fresh prospective square under steal
 * (steal.md §6), from the widened pool (constraints 3 and 4 lifted,
 * fallback included), weighted by `stealProspectiveWeight`. `occupiedNodeSquares`
 * is every square belonging to any node, the drawing node's own included;
 * `anchor` is the drawing node's charged square if it has one, otherwise its
 * remaining prospective square; `otherNodeSquares` is every square belonging
 * to any other node. Advances the seed exactly once, via `drawWeightedIndex`,
 * so a recorded game replays exactly.
 */
export function drawStealProspectiveSquare(
  occupiedNodeSquares: readonly Square[],
  anchor: Square,
  otherNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
): [square: Square, nextSeed: number] {
  const pool = legalNodePool(occupiedNodeSquares, shipSquares, "widened");
  const weights = pool.map((square) =>
    stealProspectiveWeight(square, anchor, otherNodeSquares),
  );
  const [index, nextSeed] = drawWeightedIndex(seed, weights);
  return [pool[index], nextSeed];
}
