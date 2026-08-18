// The board: 15 x 15 squares built from a game session's state (see
// BoardSquare.tsx for one square's contents). This component walks the
// grid's index space, maps each cell back to its rule-space square, and
// gives it its accessible name.

import { useCallback, useMemo } from "react";
import { BOARD_SIZE, COLUMN_LETTERS, squareName } from "../rules/board";
import { isBay } from "../rules/bays";
import { shipsBySquare, siteStateAt } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import type { Session, SessionIntent } from "../game/session";
import { announcementFor } from "./announcements";
import { squareForGridPosition } from "./boardView";
import { squareLabel, type SquareMark } from "./squareLabel";
import { BoardSquare } from "./BoardSquare";
import { AccessibleGrid, type GridCellDescriptor } from "./grid/AccessibleGrid";
import type { GridPosition } from "./grid/gridNavigation";
import "./Board.css";

/** Row numbers in the order they are drawn, top (15) to bottom (1). */
const DISPLAY_ROW_NUMBERS = Array.from(
  { length: BOARD_SIZE },
  (_, gridRow) => squareForGridPosition({ row: gridRow, column: 0 }).row,
);

export interface BoardProps {
  /** The session whose game state the board renders a picture of. */
  readonly session: Session;
  /** Dispatches a player's intent (activate or dismiss) to the session reducer. */
  readonly onIntent: (intent: SessionIntent) => void;
}

/**
 * The 15 x 15 board grid, drawn from a session's game state, with visible
 * column/row labels around its edges so a sighted reader can find a square
 * by eye. The labels are decorative: every square's accessible name already
 * carries its coordinates, so the labels are `aria-hidden` and sit outside
 * the `role="grid"` element (a grid may only own rows).
 */
export function Board({ session, onIntent }: BoardProps) {
  const handleActivate = useCallback(
    (position: GridPosition) => {
      onIntent({
        type: "activate",
        square: squareForGridPosition(position),
      });
    },
    [onIntent],
  );

  const handleDismiss = useCallback(() => {
    onIntent({ type: "dismiss" });
  }, [onIntent]);

  const rows: GridCellDescriptor[][] = useMemo(() => {
    const ships = shipsBySquare(session.state);
    const selectedShip =
      session.selectedShipId === undefined
        ? undefined
        : session.state.ships.find(
            (ship) => ship.id === session.selectedShipId,
          );
    const destinationSquareNames = new Set(
      selectedShip
        ? legalDestinations(session.state, selectedShip.id).map(squareName)
        : [],
    );

    return Array.from({ length: BOARD_SIZE }, (_, rowIndex) =>
      Array.from({ length: BOARD_SIZE }, (_, columnIndex) => {
        const square = squareForGridPosition({
          row: rowIndex,
          column: columnIndex,
        });
        const name = squareName(square);
        const bay = isBay(square);
        const siteState = siteStateAt(session.state, square);
        const ship = ships.get(name);
        const occupant = ship && { side: ship.side, shields: ship.shields };

        let mark: SquareMark | undefined;
        if (selectedShip && squareName(selectedShip.square) === name) {
          mark = "selected";
        } else if (destinationSquareNames.has(name)) {
          mark = "destination";
        } else if (ship && session.state.movedThisPly.includes(ship.id)) {
          mark = "already-moved";
        }

        return {
          content: (
            <BoardSquare
              isBay={bay}
              siteState={siteState}
              occupant={occupant}
              mark={mark}
            />
          ),
          label: squareLabel({ square, isBay: bay, siteState, occupant, mark }),
          focusable: true,
        };
      }),
    );
  }, [session]);

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
        rows={rows}
        className="board"
        onActivate={handleActivate}
        onDismiss={handleDismiss}
        announcement={announcementFor(session.lastEvent)}
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
