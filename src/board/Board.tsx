// The board: 15 x 15 squares built from a game session's state (see
// BoardSquare.tsx for one square's contents). This component walks the
// grid's index space, maps each cell back to its rule-space square, and
// gives it its accessible name.

import { useCallback, useMemo } from "react";
import { GAME_NAME } from "../gameName";
import { BOARD_SIZE, squareName } from "../rules/board";
import { isBay } from "../rules/bays";
import { shipHasLegalAction } from "../rules/actions";
import { legalTargets } from "../rules/combat";
import { shipsBySquare, nodeStatusAt, type Ship } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import { nodeCyclePosition } from "../rules/nodes";
import type { Session, SessionIntent } from "../game/session";
import { announcementForSession } from "./announcements";
import { squareForGridPosition } from "./boardView";
import {
  squareLabel,
  type ShipCondition,
  type SquareMark,
} from "./squareLabel";
import { BoardSquare } from "./BoardSquare";
import { EnergyOverlay } from "./EnergyOverlay";
import { planetForSquare } from "./planetPlacement";
import { PlanetDefs } from "./PlanetDefs";
import { AccessibleGrid, type GridCellDescriptor } from "./grid/AccessibleGrid";
import type { GridPosition } from "./grid/gridNavigation";
import "./Board.css";

export interface BoardProps {
  /** The session whose game state the board renders a picture of. */
  readonly session: Session;
  /** Dispatches a player's intent (activate or dismiss) to the session reducer. */
  readonly onIntent: (intent: SessionIntent) => void;
}

/**
 * The 15 x 15 board grid, drawn from a session's game state. No row or
 * column labels are drawn on screen; every square's accessible name already
 * carries its coordinates. The energy overlay sits outside the
 * `role="grid"` element (a grid may only own rows), alongside the grid
 * itself.
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
    const targetSquareNames = new Set(
      selectedShip
        ? legalTargets(session.state, selectedShip.id).map(squareName)
        : [],
    );
    // A ship's condition, for the side to move only: an opponent's ship
    // never carries one. The only condition is having no legal action at
    // all — no legal move and no legal attack target — which covers a
    // pinned ship and every ship that has already acted: an acted ship
    // never has a legal move or attack left. Having acted is a separate,
    // independent fact (`hasActed` below) and no longer contributes to the
    // condition.
    function shipCondition(ship: Ship): ShipCondition | undefined {
      if (ship.side !== session.state.sideToMove) {
        return undefined;
      }
      if (!shipHasLegalAction(session.state, ship.id)) {
        return "no-action";
      }
      return undefined;
    }

    return Array.from({ length: BOARD_SIZE }, (_, rowIndex) =>
      Array.from({ length: BOARD_SIZE }, (_, columnIndex) => {
        const square = squareForGridPosition({
          row: rowIndex,
          column: columnIndex,
        });
        const name = squareName(square);
        const bay = isBay(square);
        const planet = planetForSquare(square);
        const nodeStatus = nodeStatusAt(session.state, square);
        const nodeState = nodeStatus?.state;
        const cyclePosition = nodeStatus
          ? nodeCyclePosition(nodeStatus.state, nodeStatus.level)
          : undefined;
        const ship = ships.get(name);
        const occupant = ship && { side: ship.side, power: ship.power };
        const condition = ship && shipCondition(ship);
        const hasActed = ship
          ? session.state.actedThisPly.includes(ship.id)
          : false;

        let mark: SquareMark | undefined;
        if (selectedShip && squareName(selectedShip.square) === name) {
          mark = "selected";
        } else if (destinationSquareNames.has(name)) {
          mark = "destination";
        } else if (selectedShip && targetSquareNames.has(name) && ship) {
          mark = "target";
        }

        return {
          content: (
            <BoardSquare
              isBay={bay}
              squareName={name}
              planet={planet}
              nodeState={nodeState}
              cyclePosition={cyclePosition}
              occupant={occupant}
              hasActed={hasActed}
              condition={condition}
              mark={mark}
            />
          ),
          label: squareLabel({
            square,
            isBay: bay,
            nodeState,
            occupant,
            hasActed,
            condition,
            mark,
          }),
          focusable: true,
        };
      }),
    );
  }, [session]);

  return (
    <div className="board-frame">
      <PlanetDefs />
      <AccessibleGrid
        label={`${GAME_NAME} board`}
        rows={rows}
        className="board"
        onActivate={handleActivate}
        onDismiss={handleDismiss}
        announcement={announcementForSession(session)}
      />
      <EnergyOverlay session={session} />
    </div>
  );
}
