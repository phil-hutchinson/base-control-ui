// The board: 15 x 15 squares with the fourteen bays marked and the starting
// fleet drawn on them (see ShipIcon.tsx). This component walks the grid's
// index space, maps each cell back to its rule-space square, and gives it
// its accessible name.

import { BOARD_SIZE, COLUMN_LETTERS } from "../rules/board";
import { isBay } from "../rules/bays";
import { startingShipAt } from "../rules/fleet";
import { squareForGridPosition } from "./boardView";
import { squareLabel } from "./squareLabel";
import { ShipIcon } from "./ShipIcon";
import { AccessibleGrid, type GridCellDescriptor } from "./grid/AccessibleGrid";
import "./Board.css";

/** Row numbers in the order they are drawn, top (15) to bottom (1). */
const DISPLAY_ROW_NUMBERS = Array.from(
  { length: BOARD_SIZE },
  (_, gridRow) => squareForGridPosition({ row: gridRow, column: 0 }).row,
);

/**
 * The board's 15 rows of 15 cell descriptors, in grid screen order. The
 * starting position is fixed, so this is built once at module load rather
 * than on every render.
 */
const BOARD_ROWS: GridCellDescriptor[][] = Array.from(
  { length: BOARD_SIZE },
  (_, rowIndex) =>
    Array.from({ length: BOARD_SIZE }, (_, columnIndex) => {
      const square = squareForGridPosition({
        row: rowIndex,
        column: columnIndex,
      });
      const bay = isBay(square);
      const occupant = startingShipAt(square);
      return {
        content: (
          <div
            className={bay ? "board-square board-square--bay" : "board-square"}
          >
            {occupant && (
              <ShipIcon side={occupant.side} shields={occupant.shields} />
            )}
          </div>
        ),
        label: squareLabel(square, bay, occupant),
        focusable: true,
      };
    }),
);

/**
 * The 15 x 15 board grid, with the fourteen starting ships drawn on it, and
 * visible column/row labels around its edges so a sighted reader can find a
 * square by eye. The labels are decorative: every square's accessible name
 * already carries its coordinates, so the labels are `aria-hidden` and sit
 * outside the `role="grid"` element (a grid may only own rows).
 */
export function Board() {
  return (
    <div className="board-frame">
      <div className="board-frame__row-labels" aria-hidden="true">
        {DISPLAY_ROW_NUMBERS.map((row) => (
          <span key={row} className="board-frame__label">
            {row}
          </span>
        ))}
      </div>
      <AccessibleGrid
        label="Base Control board"
        rows={BOARD_ROWS}
        className="board"
      />
      <div className="board-frame__corner" aria-hidden="true" />
      <div className="board-frame__column-labels" aria-hidden="true">
        {COLUMN_LETTERS.map((column) => (
          <span key={column} className="board-frame__label">
            {column}
          </span>
        ))}
      </div>
    </div>
  );
}
