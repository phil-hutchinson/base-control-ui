// The session: a game state plus the facts about a player's interaction with
// it — which ship, if any, is selected, and the last thing that happened. A
// pure reducer turns an intent (activating a square, or dismissing a
// selection) into a new session and a structured event. Selection is not
// game state, so it lives here rather than in `src/rules/`; the event is
// structured, never a sentence — wording is decided elsewhere.

import { shipHasLegalAction } from "../rules/actions";
import { type Square, squareName } from "../rules/board";
import { type AttackRefusalReason, legalTargets } from "../rules/combat";
import type { Side, ShipId } from "../rules/fleet";
import {
  type GameState,
  shipsBySquare,
  startingGameState,
} from "../rules/gameState";
import { isGameOver } from "../rules/gameLength";
import { type MoveRefusalReason, legalDestinations } from "../rules/movement";
import {
  type AttackEffect,
  type MoveEffect,
  type PassEffect,
  applyAttack,
  applyMove,
  applyPassGuard,
} from "../rules/ply";

/**
 * A ship was selected, with how many squares it can legally move to and how
 * many enemy ships it can legally attack.
 */
export interface SelectedEvent {
  readonly type: "selected";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly destinationCount: number;
  readonly targetCount: number;
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
  /** The mover's remaining actions after this move, from the resulting state. */
  readonly actionsRemaining: number;
}

/**
 * A ship attacked another, carrying the side that attacked and everything
 * `applyAttack` reported. Neither ship moves (rules.md §7), so `from` is the
 * attacking ship's own square and `target` is the square it attacked.
 */
export interface AttackedEvent {
  readonly type: "attacked";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly from: Square;
  readonly target: Square;
  readonly effects: readonly AttackEffect[];
  /** The attacker's remaining actions after this attack, from the resulting state. */
  readonly actionsRemaining: number;
}

/**
 * The reasons an activation is rejected outright: every reason a move or an
 * attack can be refused (rules.md §6, §7), plus activating an empty square
 * with no ship selected, which has nothing to do with either action.
 */
export type RejectionReason =
  MoveRefusalReason | AttackRefusalReason | "nothing-to-select";

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
  | AttackedEvent
  | PassEffect
  | RejectedEvent;

/**
 * An intent a player's input turns into: activate a square, dismiss a
 * selection, or start a new game. `new-game` carries both the seed and the
 * length in rounds the new game starts from — the reducer uses what it is
 * handed and never draws a seed or reaches for a default length itself.
 */
export type SessionIntent =
  | { readonly type: "activate"; readonly square: Square }
  | { readonly type: "dismiss" }
  | {
      readonly type: "new-game";
      readonly randomSeed: number;
      readonly lengthInRounds: number;
    };

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
  const targetCount = legalTargets(session.state, shipId).length;
  return {
    ...session,
    selectedShipId: shipId,
    lastEvent: {
      type: "selected",
      shipId,
      side,
      square,
      destinationCount,
      targetCount,
    },
  };
}

function cleared(session: Session): Session {
  return {
    ...session,
    selectedShipId: undefined,
    lastEvent: { type: "selection-cleared" },
  };
}

/**
 * Whether `shipId` may be selected: it has a legal action of its own, or it
 * has not moved this ply yet (so it can still be a first, if currently
 * fruitless, choice — a pinned ship, or one held back by §8.5's obligation).
 * Widened from "has not moved this ply" so a ship that has moved and can
 * still attack (rules.md §5) is selectable too.
 */
function isSelectable(state: GameState, shipId: ShipId): boolean {
  return (
    shipHasLegalAction(state, shipId) || !state.movedThisPly.includes(shipId)
  );
}

/** Activating a square when no ship is currently selected. */
function activateWithNoSelection(session: Session, square: Square): Session {
  const ship = shipsBySquare(session.state).get(squareName(square));

  if (ship === undefined) {
    return rejected(session, "nothing-to-select", square);
  }
  if (ship.side !== session.state.sideToMove) {
    return rejected(session, "not-your-ship", square);
  }
  if (!isSelectable(session.state, ship.id)) {
    return rejected(session, "ship-already-moved", square);
  }
  return selected(session, ship.id, ship.side, square);
}

/** Activating a square while `selectedShipId` is already selected. */
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

  if (other !== undefined && other.side === selectedShip.side) {
    if (!isSelectable(session.state, other.id)) {
      return rejected(session, "ship-already-moved", square);
    }
    return selected(session, other.id, other.side, square);
  }

  if (other !== undefined) {
    const result = applyAttack(session.state, selectedShipId, square);
    if (result.outcome !== "applied") {
      return rejected(session, result.reason, square);
    }
    return {
      state: result.state,
      selectedShipId: undefined,
      lastEvent: {
        type: "attacked",
        shipId: selectedShipId,
        side: selectedShip.side,
        from: selectedShip.square,
        target: square,
        effects: result.effects,
        actionsRemaining: result.state.actionsRemaining,
      },
    };
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
      actionsRemaining: result.state.actionsRemaining,
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
  if (intent.type === "new-game") {
    return createSession(
      startingGameState(intent.randomSeed, intent.lengthInRounds),
    );
  }

  if (intent.type === "dismiss") {
    return session.selectedShipId === undefined ? session : cleared(session);
  }

  if (isGameOver(session.state)) {
    return rejected(session, "game-over", intent.square);
  }

  return session.selectedShipId === undefined
    ? activateWithNoSelection(session, intent.square)
    : activateWithSelection(session, session.selectedShipId, intent.square);
}
