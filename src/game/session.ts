// The session: a game state plus the facts about a player's interaction with
// it — which ship, if any, is selected, and the last thing that happened. A
// pure reducer turns an intent (activating a square, or dismissing a
// selection) into a new session and a structured event. Selection is not
// game state, so it lives here rather than in `src/rules/`; the event is
// structured, never a sentence — wording is decided elsewhere.

import { type Square, squareName } from "../rules/board";
import type { Side, ShipId } from "../rules/fleet";
import { type GameState, shipsBySquare } from "../rules/gameState";
import { type MoveRefusalReason, legalDestinations } from "../rules/movement";
import {
  type MoveEffect,
  type PassEffect,
  applyMove,
  applyPassGuard,
} from "../rules/ply";

/** A ship was selected, with how many squares it can legally move to. */
export interface SelectedEvent {
  readonly type: "selected";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly destinationCount: number;
}

/** A selection was cancelled, or replaced by moving the ship, with nothing new selected. */
export interface SelectionClearedEvent {
  readonly type: "selection-cleared";
}

/** A ship moved, carrying the side that moved it and everything `applyMove` reported. */
export interface MovedEvent {
  readonly type: "moved";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly from: Square;
  readonly to: Square;
  readonly effects: readonly MoveEffect[];
}

/**
 * The reasons an activation is rejected outright: every reason a move can be
 * refused (rules.md §6), plus activating an empty square with no ship
 * selected, which has nothing to do with a move at all.
 */
export type RejectionReason = MoveRefusalReason | "nothing-to-select";

/** An activation was rejected, naming why and which square was activated. */
export interface RejectedEvent {
  readonly type: "rejected";
  readonly reason: RejectionReason;
  readonly square: Square;
}

/** The structured record of the last thing that happened in the session. */
export type SessionEvent =
  | SelectedEvent
  | SelectionClearedEvent
  | MovedEvent
  | PassEffect
  | RejectedEvent;

/** An intent a player's input turns into: activate a square, or dismiss a selection. */
export type SessionIntent =
  | { readonly type: "activate"; readonly square: Square }
  | { readonly type: "dismiss" };

/** The game state, the selected ship if any, and the last thing that happened. */
export interface Session {
  readonly state: GameState;
  readonly selectedShipId: ShipId | undefined;
  readonly lastEvent: SessionEvent | undefined;
}

/**
 * The initial session for a starting game state. Runs the §5 pass guard once
 * so a starting position with no legal move at all is never sat on — the
 * same guard `applyMove` runs after every move.
 */
export function createSession(state: GameState): Session {
  const { state: settled, effect } = applyPassGuard(state);
  return {
    state: settled,
    selectedShipId: undefined,
    lastEvent: effect,
  };
}

function withEvent(session: Session, event: SessionEvent): Session {
  return { ...session, lastEvent: event };
}

function rejected(
  session: Session,
  reason: RejectionReason,
  square: Square,
): Session {
  return withEvent(session, { type: "rejected", reason, square });
}

function selected(
  session: Session,
  shipId: ShipId,
  side: Side,
  square: Square,
): Session {
  const destinationCount = legalDestinations(session.state, shipId).length;
  return {
    ...session,
    selectedShipId: shipId,
    lastEvent: { type: "selected", shipId, side, square, destinationCount },
  };
}

function cleared(session: Session): Session {
  return {
    ...session,
    selectedShipId: undefined,
    lastEvent: { type: "selection-cleared" },
  };
}

/** Activating a square when no ship is currently selected (plan decision 7). */
function activateWithNoSelection(session: Session, square: Square): Session {
  const ship = shipsBySquare(session.state).get(squareName(square));

  if (ship === undefined) {
    return rejected(session, "nothing-to-select", square);
  }
  if (ship.side !== session.state.sideToMove) {
    return rejected(session, "not-your-ship", square);
  }
  if (session.state.movedThisPly.includes(ship.id)) {
    return rejected(session, "ship-already-moved", square);
  }
  return selected(session, ship.id, ship.side, square);
}

/** Activating a square while `selectedShipId` is already selected (plan decision 7). */
function activateWithSelection(
  session: Session,
  selectedShipId: ShipId,
  square: Square,
): Session {
  const selectedShip = session.state.ships.find(
    (ship) => ship.id === selectedShipId,
  );
  if (selectedShip === undefined) {
    throw new RangeError(`no ship with id "${selectedShipId}" in this state`);
  }

  if (squareName(selectedShip.square) === squareName(square)) {
    return cleared(session);
  }

  const other = shipsBySquare(session.state).get(squareName(square));
  if (
    other !== undefined &&
    other.side === selectedShip.side &&
    other.id !== selectedShipId &&
    !session.state.movedThisPly.includes(other.id)
  ) {
    return selected(session, other.id, other.side, square);
  }

  const result = applyMove(session.state, selectedShipId, square);
  if (result.outcome !== "applied") {
    return rejected(session, result.reason, square);
  }

  return {
    state: result.state,
    selectedShipId: undefined,
    lastEvent: {
      type: "moved",
      shipId: selectedShipId,
      side: selectedShip.side,
      from: selectedShip.square,
      to: square,
      effects: result.effects,
    },
  };
}

/**
 * The session's pure reducer: an intent in, a new session out. Never mutates
 * `session`.
 */
export function sessionReducer(
  session: Session,
  intent: SessionIntent,
): Session {
  if (intent.type === "dismiss") {
    return session.selectedShipId === undefined ? session : cleared(session);
  }

  return session.selectedShipId === undefined
    ? activateWithNoSelection(session, intent.square)
    : activateWithSelection(session, session.selectedShipId, intent.square);
}
