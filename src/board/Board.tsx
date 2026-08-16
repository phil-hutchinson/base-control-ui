// The board: 15 x 15 squares with the fourteen bays marked and the starting
// fleet drawn on them (see ShipIcon.tsx). This component walks the grid's
// index space, maps each cell back to its rule-space square, and gives it
// its accessible name.

import { BOARD_SIZE } from "../rules/board";
import { isBay } from "../rules/bays";
import { startingSideAt } from "../rules/fleet";
import { squareForGridPosition } from "./boardView";
import { squareLabel } from "./squareLabel";
import { ShipIcon } from "./ShipIcon";
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
      const occupant = startingSideAt(square);
      return {
        content: (
          <div
            className={bay ? "board-square board-square--bay" : "board-square"}
          >
            {occupant && <ShipIcon side={occupant} />}
          </div>
        ),
        label: squareLabel(square, bay, occupant),
        focusable: true,
      };
    }),
  );
}

/** The 15 x 15 board grid, with the fourteen starting ships drawn on it. */
export function Board() {
  return (
    <AccessibleGrid
      label="Base Control board"
      rows={boardRows()}
      className="board"
    />
  );
}
