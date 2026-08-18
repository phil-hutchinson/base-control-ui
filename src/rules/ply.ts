// Applying a move, and the ply it belongs to (rules.md §5, §3.1, §8.2). A
// move is either refused, with the reason from movement.ts, or applied: the
// ship arrives, is marked as having moved, spends one action, wakes any
// active site it touched on the way, and loses its shields if it ends in a
// bay. When the ply's two actions are spent, play passes to the other side.
// The pass guard covers the case §5 sets out for when the side to move has
// no legal move at all.

import { isBay } from "./bays";
import { type Square, squareName } from "./board";
import { type EndOfTurnEffect, runEndOfTurn } from "./endOfTurn";
import type { Side, ShipId } from "./fleet";
import { ACTIONS_PER_PLY, type GameState } from "./gameState";
import {
  type MoveRefusalReason,
  moveRefusalReason,
  reachFrom,
  sideToMoveHasLegalMove,
} from "./movement";
import { type SiteChargedEffect, wakeTouchedSites } from "./nodes";

function otherSide(side: Side): Side {
  return side === "green" ? "red" : "green";
}

/** The side to move passed because it had no legal move at all (rules.md §5). */
export interface PassEffect {
  readonly type: "ply-passed";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/** A ply ended because its second action was spent (rules.md §5, §8.7). */
export interface PlyEndedEffect {
  readonly type: "ply-ended";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/**
 * The two effects that can close out an action, shared by every kind of
 * action rather than tied to moves specifically.
 */
export type EndOfActionEffect = PlyEndedEffect | PassEffect;

/** Something that happened as a result of applying a move, beyond the move itself. */
export type MoveEffect =
  | { readonly type: "shields-reset"; readonly shipId: ShipId }
  | SiteChargedEffect
  | EndOfActionEffect;

/** A move applied successfully, with the resulting state and what happened. */
export interface AppliedMove {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly MoveEffect[];
}

/** A move that was not legal, carrying the reason (never a sentence). */
export interface RefusedMove {
  readonly outcome: "refused";
  readonly reason: MoveRefusalReason;
}

export type ApplyMoveResult = AppliedMove | RefusedMove;

/**
 * If the side to move has no legal move at all with any eligible ship, its
 * ply passes: the end-of-turn sequence runs for it (a passed ply is still a
 * turn), the moved-this-ply marks clear, the action count resets to
 * `ACTIONS_PER_PLY`, the ply number advances and the other side becomes the
 * side to move (rules.md §5, §8.7). Only the side to move is checked — the
 * side passed to is not — so this makes exactly one pass, never a second one
 * back.
 */
export function applyPassGuard(state: GameState): {
  readonly state: GameState;
  readonly effect: PassEffect | undefined;
} {
  if (sideToMoveHasLegalMove(state)) {
    return { state, effect: undefined };
  }

  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state);
  const passedState: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
    actionsRemaining: ACTIONS_PER_PLY,
    movedThisPly: [],
  };

  return {
    state: passedState,
    effect: {
      type: "ply-passed",
      side,
      sideToMove,
      endOfTurn: endOfTurn.effects,
    },
  };
}

/**
 * Runs the tail every action shares once its own effects have been applied:
 * spends one action; if that was the ply's second, runs the end-of-turn
 * sequence, advances the ply number, swaps the side to move and clears
 * `movedThisPly`, recording a `ply-ended` effect; then runs `applyPassGuard`,
 * recording a `ply-passed` effect if it fires. `movedShipId` is added to
 * `movedThisPly` when given, and omitted for an action — an attack, in
 * particular — that does not count as a move (rules.md §5). Mutates
 * `effects` by appending whichever of the two end-of-action effects fired,
 * and returns the resulting state.
 */
function applyEndOfActionTail(
  state: GameState,
  effects: MoveEffect[],
  movedShipId?: ShipId,
): GameState {
  const actionsRemaining = state.actionsRemaining - 1;
  let next: GameState;
  if (actionsRemaining > 0) {
    next = {
      ...state,
      movedThisPly:
        movedShipId === undefined
          ? state.movedThisPly
          : [...state.movedThisPly, movedShipId],
      actionsRemaining,
    };
  } else {
    const side = state.sideToMove;
    const sideToMove = otherSide(side);
    const endOfTurn = runEndOfTurn(state);
    next = {
      ...endOfTurn.state,
      plyNumber: endOfTurn.state.plyNumber + 1,
      sideToMove,
      actionsRemaining: ACTIONS_PER_PLY,
      movedThisPly: [],
    };
    effects.push({
      type: "ply-ended",
      side,
      sideToMove,
      endOfTurn: endOfTurn.effects,
    });
  }

  const { state: settled, effect: passEffect } = applyPassGuard(next);
  if (passEffect !== undefined) {
    effects.push(passEffect);
  }

  return settled;
}

/**
 * Applies a move of `shipId` to `destination` in `state`, or refuses it. A
 * legal move never mutates `state`: it returns a new state in which the ship
 * stands on `destination`, the square it left is empty, the ship is marked as
 * having moved this ply, one action is spent, and — per rules.md §3.1 — the
 * ship's shields are reset to 0 if `destination` is a bay. When the ply's
 * second action is spent, play passes to the other side and the
 * moved-this-ply marks clear. The result then passes through
 * `applyPassGuard`, so a move that leaves the side now to move with no legal
 * move at all is followed immediately by a pass.
 */
export function applyMove(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): ApplyMoveResult {
  const reason = moveRefusalReason(state, shipId, destination);
  if (reason !== undefined) {
    return { outcome: "refused", reason };
  }

  const effects: MoveEffect[] = [];
  const endsInBay = isBay(destination);
  const movingShip = state.ships.find((ship) => ship.id === shipId);
  if (movingShip === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  const destinationName = squareName(destination);
  const path = reachFrom(movingShip.square, movingShip.shields).find(
    (entry) => squareName(entry.destination) === destinationName,
  );
  if (path === undefined) {
    throw new RangeError(
      `no reach entry for ship "${shipId}" to a legal destination`,
    );
  }

  const ships = state.ships.map((ship) =>
    ship.id === shipId
      ? {
          ...ship,
          square: destination,
          shields: endsInBay ? 0 : ship.shields,
        }
      : ship,
  );
  if (endsInBay && movingShip.shields > 0) {
    effects.push({ type: "shields-reset", shipId });
  }

  const afterMove: GameState = { ...state, ships };
  const wake = wakeTouchedSites(afterMove, movingShip, path);
  effects.push(...wake.effects);

  const settled = applyEndOfActionTail(wake.state, effects, shipId);

  return { outcome: "applied", state: settled, effects };
}
