// Where a new node may appear (rules.md §3.2), and how one is drawn there.
// A pure function of the nodes placed so far and the squares ships occupy —
// used by the opening deal, before a `GameState` exists, and by the refill
// procedure in `nodeQueue.ts`, whose caller reads those two things off its
// state itself.

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
 * it; the `"widened"` pool, used for the second and third square of a
 * refill (section 8.2), lifts the inner ring but never the outer edge
 * itself.
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
 * How many rings the `"widened"` pool excludes (rules.md §3.2): constraint
 * 4 is lifted, so only the outer edge itself (constraint 3) stays closed.
 */
const WIDENED_EXCLUDED_EDGE_RINGS = 1;

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
 * 3. it is not on the outer edge;
 * 4. it is not one square in from the edge — dropped for the `"widened"`
 *    pool (`poolWidth`), which a refill's second and third draw use;
 * 5. it is not orthogonally or diagonally adjacent to a square that holds a
 *    node;
 * 6. it is not a planet, and is not orthogonally or diagonally adjacent to
 *    one.
 *
 * If nothing qualifies, the pool falls back to every square that holds no
 * node and is not a planet — the whole relaxation at once, not one
 * constraint dropped at a time. The fallback is the same regardless of
 * `poolWidth`: it is already the whole relaxation at once, so there is
 * nothing left for `poolWidth` to widen. The fallback keeps a node off a
 * planet, but, unlike the ordinary pool, does **not** keep it off a
 * planet's neighbours or the board's edge: it may legitimately hand back a
 * square adjacent to a planet. If even the fallback is empty, throws a
 * `RangeError` naming the situation, rather than returning an empty pool for
 * `drawNodeSquare` to fail on with a generic message.
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
    return !nodeNames.has(name) && !isPlanet(square);
  });

  if (fallback.length === 0) {
    throw new RangeError(
      "legalNodePool: no square is available for a new node — every square that is not a planet already holds one",
    );
  }

  return fallback;
}

/**
 * Draws one square for a new node from `legalNodePool`'s strict pool,
 * uniformly — a new node has no priority to weight by (rules.md §8.1).
 * Used by the opening deal for its four charged squares. Advances the seed
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
 * Draws one square uniformly from an already-computed pool. For the two
 * draws §3.2 makes with no distance weighting at all: the opening deal's
 * four charged squares, and the fourth node placed directly when all four
 * charged nodes run out at once (§8.2). Advances the seed exactly once, via
 * `drawIndex`, so a recorded game replays exactly.
 */
export function drawUniformSquare(
  pool: readonly Square[],
  seed: number,
): [square: Square, nextSeed: number] {
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
