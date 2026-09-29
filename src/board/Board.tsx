// The board: 15 x 15 squares built from a game session's state (see
// BoardSquare.tsx for one square's contents). This component walks the
// grid's index space, maps each cell back to its rule-space square, and
// gives it its accessible name. `glowSquare` is the one piece it draws that
// is not part of the game state: which planet, if any, the player is
// currently hovering in the bonus panel above the clocks, held and passed
// down by `App`. The link runs the other way too: `onHoverSquare` reports
// the pointer entering a planet square on the board, but only for a square
// the bonus panel currently draws (`bonusPanelSquareNames`) — entering any
// other planet, or any other square, reports nothing. Every square reports
// the pointer leaving it, whether or not it was one the panel drew, so a
// square that stops being a bonus planet the moment it is claimed still
// clears the hover when the pointer moves off it.

import { useCallback, useMemo } from "react";
import { bonusPanelSquareNames } from "../bonus/bonusPanelSquares";
import { isTouchPointer } from "../bonus/pointerHover";
import { GAME_NAME } from "../gameName";
import { BOARD_SIZE, squareName, type Square } from "../rules/board";
import { isPlanet } from "../rules/planets";
import { shipCanMoveOrAttack } from "../rules/canMoveOrAttack";
import { legalAttacks } from "../rules/combat";
import { shipsBySquare, nodeStatusAt, type Ship } from "../rules/gameState";
import { legalMoves } from "../rules/movement";
import { matchedSideForSignal } from "../rules/steal";
import type { PowerLevel } from "../rules/power";
import { countdownNumber, nodeCyclePosition } from "../rules/countdown";
import { inactivePriority } from "../rules/nodeQueue";
import type { Session, SessionIntent } from "../game/session";
import { respell } from "../spelling/spelling";
import { useSpelling } from "../spelling/spellingContext";
import { announcementForSession } from "./announcements";
import { boardAnimations } from "./boardAnimations";
import { squareForGridPosition } from "./boardView";
import {
  squareLabel,
  type ShipCondition,
  type SquareMark,
} from "./squareLabel";
import { BoardSquare } from "./BoardSquare";
import { EnergyOverlay } from "./EnergyOverlay";
import { planetArrangement, planetForSquare } from "./planetPlacement";
import { AccessibleGrid, type GridCellDescriptor } from "./grid/AccessibleGrid";
import type { GridPosition } from "./grid/gridNavigation";
import "./Board.css";

export interface BoardProps {
  /** The session whose game state the board renders a picture of. */
  readonly session: Session;
  /** Dispatches a player's intent (activate or dismiss) to the session reducer. */
  readonly onIntent: (intent: SessionIntent) => void;
  /**
   * The planet square, if any, to draw glowing — because the player is
   * hovering that planet in the bonus panel above the clocks (`App`'s
   * lifted hover state). Not part of `session.state`.
   */
  readonly glowSquare?: Square;
  /**
   * Reports the square the pointer is over as it enters a bonus planet
   * square, so `App` can light the matching cell in the bonus panel above
   * the clocks, and `undefined` as the pointer leaves any square, bonus
   * planet or not. Omit for no hover reporting.
   */
  readonly onHoverSquare?: (square: Square | undefined) => void;
}

/**
 * The 15 x 15 board grid, drawn from a session's game state. No row or
 * column labels are drawn on screen; every square's accessible name already
 * carries its coordinates. The energy overlay sits outside the
 * `role="grid"` element (a grid may only own rows), alongside the grid
 * itself.
 */
export function Board({
  session,
  onIntent,
  glowSquare,
  onHoverSquare,
}: BoardProps) {
  const spelling = useSpelling();

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

  const glowSquareName =
    glowSquare === undefined ? undefined : squareName(glowSquare);

  const rows: GridCellDescriptor[][] = useMemo(() => {
    const hoverableSquareNames = bonusPanelSquareNames(session.state);
    const ships = shipsBySquare(session.state);
    const animations = boardAnimations(session);
    const rotatorSquareNames = new Set(
      session.state.rotators.map((square) => squareName(square)),
    );
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
        const signal = nodeStatus?.signal;
        const matchedSide =
          signal === undefined
            ? undefined
            : matchedSideForSignal(session.state, signal);
        const occupant = ship && { side: ship.side, power: ship.power };
        const condition = ship && shipCondition(ship);
        const hasRotator = rotatorSquareNames.has(name);

        const destinationCost = destinationCosts.get(name);
        const targetCost = targetCosts.get(name);
        const hoverable = hoverableSquareNames.has(name);

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
              signal={signal}
              matchedSide={matchedSide}
              hasRotator={hasRotator}
              countdownNumber={countdown}
              occupant={occupant}
              condition={condition}
              mark={mark}
              animation={animations.get(name)}
              glow={name === glowSquareName}
              onPointerEnter={
                hoverable
                  ? (event) => {
                      if (!isTouchPointer(event)) {
                        onHoverSquare?.(square);
                      }
                    }
                  : undefined
              }
              onPointerLeave={(event) => {
                if (!isTouchPointer(event)) {
                  onHoverSquare?.(undefined);
                }
              }}
            />
          ),
          label: respell(
            squareLabel({
              square,
              isPlanet: planetSquare,
              nodeState,
              hasRotator,
              occupant,
              condition,
              mark,
            }),
            spelling,
          ),
          focusable: true,
        };
      }),
    );
  }, [session, arrangement, glowSquareName, onHoverSquare, spelling]);

  return (
    <div className="board-frame">
      <AccessibleGrid
        label={`${GAME_NAME} board`}
        rows={rows}
        className="board"
        onActivate={handleActivate}
        onDismiss={handleDismiss}
        announcement={respell(announcementForSession(session), spelling)}
      />
      <EnergyOverlay session={session} />
    </div>
  );
}
