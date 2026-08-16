// The board: 15 x 15 squares with the fourteen bays marked. Ships are drawn
// separately (see ShipIcon.tsx); this component only walks the grid's index
// space, maps each cell back to its rule-space square, and gives it its
// accessible name.

import { BOARD_SIZE } from "../rules/board";
import { isBay } from "../rules/bays";
import { squareForGridPosition } from "./boardView";
import { squareLabel } from "./squareLabel";
import { AccessibleGrid, type GridCellDescriptor } from "./grid/AccessibleGrid";
import "./Board.css";

/** The board's 15 rows of 15 cell descriptors, in grid screen order. */
function boardRows(): GridCellDescriptor[][] {
  return Array.from({ length: BOARD_SIZE }, (_, rowIndex) =>
    Array.from({ length: BOARD_SIZE }, (_, columnIndex) => {
      const square = squareForGridPosition({
        row: rowIndex,
        column: columnIndex,
      });
      const bay = isBay(square);
      return {
        content: (
          <div
            className={bay ? "board-square board-square--bay" : "board-square"}
          />
        ),
        label: squareLabel(square, bay, undefined),
        focusable: true,
      };
    }),
  );
}

/** The 15 x 15 board grid: squares and bays, drawn empty of ships. */
export function Board() {
  return (
    <AccessibleGrid
      label="Base Control board"
      rows={boardRows()}
      className="board"
    />
  );
}
