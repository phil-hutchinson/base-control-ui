// Maps between rule-space squares (rules.md §3: column A-O left to right,
// row 1-15 bottom to top) and the grid's zero-based screen-space positions
// (row 0 topmost, column 0 leftmost). The board is drawn with row 15 at the
// top, so this is where that row inversion happens - column order matches
// already, since both are lettered/indexed left to right.

import {
  COLUMN_LETTERS,
  BOARD_SIZE,
  squareAt,
  type Square,
} from "../rules/board";
import type { GridPosition } from "./grid/gridNavigation";

/** The square's grid position: board row 15 is grid row 0, column A is grid column 0. */
export function gridPositionForSquare(square: Square): GridPosition {
  return {
    row: BOARD_SIZE - square.row,
    column: COLUMN_LETTERS.indexOf(square.column),
  };
}

/** The square drawn at a grid position, the inverse of `gridPositionForSquare`. */
export function squareForGridPosition(position: GridPosition): Square {
  if (
    !Number.isInteger(position.row) ||
    !Number.isInteger(position.column) ||
    position.row < 0 ||
    position.row >= BOARD_SIZE ||
    position.column < 0 ||
    position.column >= BOARD_SIZE
  ) {
    throw new RangeError(
      `grid position row ${position.row}, column ${position.column} is off the board`,
    );
  }
  return squareAt(COLUMN_LETTERS[position.column], BOARD_SIZE - position.row);
}

/** A position expressed as percentages of the grid's own box, for placing a decorative overlay over it without measuring anything. */
export interface PercentPosition {
  readonly top: number;
  readonly left: number;
}

/**
 * The centroid of one or more squares, as a percentage position across the
 * grid (a single square's own centre sits at `(index + 0.5) / 15`). Used to
 * place the decorative "+N" a collection pays: one payout is one number
 * (rules.md §8.4 pays for the count of nodes held), so it lands at the
 * centroid of the nodes that paid rather than split across them. Throws on
 * an empty list, since a centroid needs at least one point.
 */
export function centroidPercentPosition(
  squares: readonly Square[],
): PercentPosition {
  if (squares.length === 0) {
    throw new RangeError(
      "centroidPercentPosition requires at least one square",
    );
  }
  const positions = squares.map(gridPositionForSquare);
  const averageRow =
    positions.reduce((sum, position) => sum + position.row, 0) /
    positions.length;
  const averageColumn =
    positions.reduce((sum, position) => sum + position.column, 0) /
    positions.length;
  return {
    top: ((averageRow + 0.5) / BOARD_SIZE) * 100,
    left: ((averageColumn + 0.5) / BOARD_SIZE) * 100,
  };
}
