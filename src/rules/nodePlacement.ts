// Where a new node may appear (rules.md §3.2), and how one is drawn there.
// Used by the opening deal, before a GameState exists — hence the pool
// builder takes the nodes placed so far and the squares ships occupy rather
// than a state — and by end-of-turn retirement, which does have a state and
// gets a thin convenience wrapper.

import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  squareName,
} from "./board";
import { isBay } from "./bays";
import { type GameState, nodeSquares } from "./gameState";
import { drawIndex } from "./random";

/**
 * How many rings of squares around the outer edge a new node may never
 * occupy (rules.md §3.2, constraints 3 and 4): not the outer edge itself,
 * and not one square in from it. Leaves the 11 x 11 interior C3-M13 on a
 * 15 x 15 board.
 */
const EXCLUDED_EDGE_RINGS = 2;

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

/**
 * The squares a new node may legally occupy (rules.md §3.2), given the
 * squares that already hold a node and the squares ships occupy, in board
 * order. An optional square to exclude — the one a retiring node has just
 * left — is removed from the result too, in the ordinary pool and in the
 * fallback alike.
 *
 * A square qualifies when all five of §3.2's constraints hold:
 *
 * 1. it holds no node already;
 * 2. no ship stands on it;
 * 3. it is not on the outer edge;
 * 4. it is not one square in from the edge;
 * 5. it is not orthogonally or diagonally adjacent to a square that holds a
 *    node.
 *
 * If nothing qualifies, the pool falls back to every square that holds no
 * node and is not a bay — the whole relaxation at once, not one constraint
 * dropped at a time — still honouring the excluded square. If even that is
 * empty, throws a `RangeError` naming the situation, rather than returning
 * an empty pool for `drawNodeSquare` to fail on with a generic message.
 */
export function legalNodePool(
  occupiedNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  exclude?: Square,
): readonly Square[] {
  const nodeNames = new Set(occupiedNodeSquares.map(squareName));
  const shipNames = new Set(shipSquares.map(squareName));
  const excludedName = exclude ? squareName(exclude) : undefined;

  const pool = ALL_SQUARES.filter((square) => {
    const name = squareName(square);
    return (
      name !== excludedName &&
      !nodeNames.has(name) &&
      !shipNames.has(name) &&
      distanceFromEdge(square) >= EXCLUDED_EDGE_RINGS &&
      !isAdjacentToAnyNode(square, occupiedNodeSquares)
    );
  });

  if (pool.length > 0) {
    return pool;
  }

  const fallback = ALL_SQUARES.filter((square) => {
    const name = squareName(square);
    return name !== excludedName && !nodeNames.has(name) && !isBay(square);
  });

  if (fallback.length === 0) {
    throw new RangeError(
      "legalNodePool: no square is available for a new node — every square that is not a bay already holds one",
    );
  }

  return fallback;
}

/**
 * Draws one square for a new node from `legalNodePool`'s pool, uniformly —
 * a new node has no pressure to weight by, exactly as the opening deal's
 * charged draw is uniform today. Advances the seed exactly once, via
 * `drawIndex`, so a recorded game replays exactly.
 */
export function drawNodeSquare(
  occupiedNodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
  exclude?: Square,
): [square: Square, nextSeed: number] {
  const pool = legalNodePool(occupiedNodeSquares, shipSquares, exclude);
  const [index, nextSeed] = drawIndex(seed, pool.length);
  return [pool[index], nextSeed];
}

/**
 * A thin convenience over `drawNodeSquare` for callers that already have a
 * `GameState` — the end-of-turn retirement draw — reading the occupied node
 * squares, the ships' squares and the seed to draw from straight off it.
 * The opening deal has no state to give this yet, so it calls
 * `drawNodeSquare` directly (see D13 in the implementation plan).
 */
export function drawNodeSquareForState(
  state: GameState,
  exclude?: Square,
): [square: Square, nextSeed: number] {
  return drawNodeSquare(
    nodeSquares(state),
    state.ships.map((ship) => ship.square),
    state.randomSeed,
    exclude,
  );
}
