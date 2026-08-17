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
