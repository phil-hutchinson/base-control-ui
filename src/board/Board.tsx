// The board: 15 x 15 squares built from a game session's state (see
// BoardSquare.tsx for one square's contents). This component walks the
// grid's index space, maps each cell back to its rule-space square, and
// gives it its accessible name.

import { useCallback, useMemo } from "react";
import { BOARD_SIZE, squareName } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
import { shipHasLegalAction } from "../rules/actions";
import {
  legalTargets,
  receptacleBay,
  resolveFight,
  returnPositionSquare,
} from "../rules/combat";
import { shipsBySquare, siteStatusAt, type Ship } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import { siteCyclePosition } from "../rules/sites";
import { strandedShipIds } from "../rules/stranded";
import type { Session, SessionIntent } from "../game/session";
import { announcementForSession } from "./announcements";
import { squareForGridPosition } from "./boardView";
import {
  squareLabel,
  type ReturnCue,
  type ShipCondition,
  type SquareMark,
} from "./squareLabel";
import { BoardSquare } from "./BoardSquare";
import { EnergyOverlay } from "./EnergyOverlay";
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
    const owedShipIds = new Set(strandedShipIds(session.state));

    // Return position 1 is always well-defined (rules.md §7.1): it is just
    // an index into the ring, empty bay or not. The receptacle is only
    // meaningful once some bay is actually empty — combat.ts's own
    // `receptacleBay` throws otherwise, on the assumption (true whenever a
    // fight can happen) that a returning ship's own vacated bay guarantees
    // room. At the game's own starting position every bay still holds its
    // starting ship, so that assumption does not yet hold; the board simply
    // shows no receptacle cue until a bay actually empties.
    const returnPositionSquareName = squareName(
      returnPositionSquare(session.state),
    );
    const anyBayEmpty = BAYS.some((bay) => !ships.has(squareName(bay)));
    const receptacleSquareName = anyBayEmpty
      ? squareName(receptacleBay(session.state))
      : undefined;

    // A ship's condition, for the side to move only: an opponent's ship
    // never carries one. Owing an action takes precedence from the start of
    // the turn, when the obligation already binds; then having no legal
    // action at all — no legal move and no legal attack target — which
    // covers a pinned ship, a ship held back by the obligation elsewhere,
    // and every ship that has already acted: an acted ship never has a
    // legal move or attack left. Having acted is a separate, independent
    // fact (`hasActed` below) and no longer contributes to the condition.
    function shipCondition(ship: Ship): ShipCondition | undefined {
      if (ship.side !== session.state.sideToMove) {
        return undefined;
      }
      if (owedShipIds.has(ship.id)) {
        return "owes-action";
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
        const siteStatus = siteStatusAt(session.state, square);
        const siteState = siteStatus?.state;
        const cyclePosition = siteStatus
          ? siteCyclePosition(
              siteStatus.state,
              siteStatus.enteredOnPly,
              session.state.plyNumber,
            )
          : undefined;
        const ship = ships.get(name);
        const occupant = ship && { side: ship.side, shields: ship.shields };
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
          mark = {
            kind: "target",
            outcome: resolveFight(selectedShip.shields, ship.shields).result,
          };
        }

        // The two return-position cues are independent of `mark` and of
        // each other's usual exclusivity: a bay can be position 1 and the
        // current receptacle at once, when position 1 happens to be empty.
        const isReturnPosition = name === returnPositionSquareName;
        const isReceptacle = name === receptacleSquareName;
        let returnCue: ReturnCue | undefined;
        if (isReturnPosition && isReceptacle) {
          returnCue = "return-position-and-receptacle";
        } else if (isReturnPosition) {
          returnCue = "return-position";
        } else if (isReceptacle) {
          returnCue = "receptacle";
        }

        return {
          content: (
            <BoardSquare
              isBay={bay}
              squareName={name}
              siteState={siteState}
              cyclePosition={cyclePosition}
              returnCue={returnCue}
              occupant={occupant}
              hasActed={hasActed}
              condition={condition}
              mark={mark}
            />
          ),
          label: squareLabel({
            square,
            isBay: bay,
            siteState,
            returnCue,
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
      <AccessibleGrid
        label="Base Control board"
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
