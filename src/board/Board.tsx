// The board: 15 x 15 squares built from a game session's state (see
// BoardSquare.tsx for one square's contents). This component walks the
// grid's index space, maps each cell back to its rule-space square, and
// gives it its accessible name.

import { useCallback, useMemo } from "react";
import { GAME_NAME } from "../gameName";
import { BOARD_SIZE, squareName } from "../rules/board";
import { isPlanet } from "../rules/planets";
import { shipCanMoveOrAttack } from "../rules/canMoveOrAttack";
import { legalAttacks } from "../rules/combat";
import { shipsBySquare, nodeStatusAt, type Ship } from "../rules/gameState";
import { legalMoves } from "../rules/movement";
import type { PowerLevel } from "../rules/power";
import { countdownNumber, nodeCyclePosition } from "../rules/countdown";
import { inactivePriority } from "../rules/nodeQueue";
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
import { planetArrangement, planetForSquare } from "./planetPlacement";
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

  const arrangement = useMemo(
    () => planetArrangement(session.state.openingSeed),
    [session.state.openingSeed],
  );

  const rows: GridCellDescriptor[][] = useMemo(() => {
    const ships = shipsBySquare(session.state);
    const selectedShip =
      session.selectedShipId === undefined
        ? undefined
        : session.state.ships.find(
            (ship) => ship.id === session.selectedShipId,
          );
    const destinationCosts = new Map<string, PowerLevel>(
      selectedShip
        ? legalMoves(session.state, selectedShip.id).map((entry) => [
            squareName(entry.destination),
            entry.cost,
          ])
        : [],
    );
    const targetCosts = new Map<string, PowerLevel>(
      selectedShip
        ? legalAttacks(session.state, selectedShip.id).map((entry) => [
            squareName(entry.destination),
            entry.cost,
          ])
        : [],
    );
    // A ship's condition, for the side to move only: an opponent's ship
    // never carries one. The only condition is a pinned ship — one that can
    // neither move nor attack.
    function shipCondition(ship: Ship): ShipCondition | undefined {
      if (ship.side !== session.state.sideToMove) {
        return undefined;
      }
      if (!shipCanMoveOrAttack(session.state, ship.id)) {
        return "cannot-move-or-attack";
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
        const planetSquare = isPlanet(square);
        const planet = planetForSquare(arrangement, square);
        const nodeStatus = nodeStatusAt(session.state, square);
        const nodeState = nodeStatus?.state;
        const ship = ships.get(name);
        const cyclePosition =
          nodeStatus &&
          (nodeStatus.state === "charged" || nodeStatus.state === "depleted")
            ? nodeCyclePosition(
                nodeStatus.state,
                nodeStatus.level,
                ship !== undefined,
              )
            : undefined;
        const countdown =
          nodeStatus &&
          (nodeStatus.state === "charged" || nodeStatus.state === "depleted")
            ? countdownNumber(
                nodeStatus.state,
                nodeStatus.level,
                ship !== undefined,
              )
            : undefined;
        const priority =
          nodeStatus && nodeStatus.state === "inactive"
            ? inactivePriority(nodeStatus)
            : undefined;
        const occupant = ship && { side: ship.side, power: ship.power };
        const condition = ship && shipCondition(ship);

        const destinationCost = destinationCosts.get(name);
        const targetCost = targetCosts.get(name);

        let mark: SquareMark | undefined;
        if (selectedShip && squareName(selectedShip.square) === name) {
          mark = { kind: "selected" };
        } else if (destinationCost !== undefined) {
          mark = { kind: "destination", cost: destinationCost };
        } else if (selectedShip && targetCost !== undefined && ship) {
          mark = { kind: "target", cost: targetCost };
        }

        return {
          content: (
            <BoardSquare
              isPlanet={planetSquare}
              squareName={name}
              planet={planet}
              nodeState={nodeState}
              cyclePosition={cyclePosition}
              priority={priority}
              countdownNumber={countdown}
              occupant={occupant}
              condition={condition}
              mark={mark}
            />
          ),
          label: squareLabel({
            square,
            isPlanet: planetSquare,
            nodeState,
            occupant,
            condition,
            mark,
          }),
          focusable: true,
        };
      }),
    );
  }, [session, arrangement]);

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
