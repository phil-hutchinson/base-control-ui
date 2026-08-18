// Applying a move, and the ply it belongs to (rules.md §5, §3.1). A move is
// either refused, with the reason from movement.ts, or applied: the ship
// arrives, is marked as having moved, spends one action, and loses its
// shields if it ends in a bay. When the ply's two actions are spent, play
// passes to the other side. The pass guard covers the case §5 sets out for
// when the side to move has no legal move at all.

import { isBay } from "./bays";
import type { Square } from "./board";
import type { Side, ShipId } from "./fleet";
import { ACTIONS_PER_PLY, type GameState } from "./gameState";
import {
  type MoveRefusalReason,
  moveRefusalReason,
  sideToMoveHasLegalMove,
} from "./movement";

function otherSide(side: Side): Side {
  return side === "green" ? "red" : "green";
}

/** The side to move passed because it had no legal move at all (rules.md §5). */
export interface PassEffect {
  readonly type: "ply-passed";
  readonly side: Side;
  readonly sideToMove: Side;
}

/** Something that happened as a result of applying a move, beyond the move itself. */
export type MoveEffect =
  | { readonly type: "shields-reset"; readonly shipId: ShipId }
  | { readonly type: "ply-ended"; readonly sideToMove: Side }
  | PassEffect;

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
 * ply passes: the moved-this-ply marks clear, the action count resets to
 * `ACTIONS_PER_PLY`, and the other side becomes the side to move (rules.md
 * §5). Only the side to move is checked — the side passed to is not — so
 * this makes exactly one pass, never a second one back.
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
  const passedState: GameState = {
    ...state,
    sideToMove,
    actionsRemaining: ACTIONS_PER_PLY,
    movedThisPly: [],
  };

  return {
    state: passedState,
    effect: { type: "ply-passed", side, sideToMove },
  };
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

  const ships = state.ships.map((ship) =>
    ship.id === shipId
      ? {
          ...ship,
          square: destination,
          shields: endsInBay ? 0 : ship.shields,
        }
      : ship,
  );
  if (endsInBay && movingShip !== undefined && movingShip.shields > 0) {
    effects.push({ type: "shields-reset", shipId });
  }

  const actionsRemaining = state.actionsRemaining - 1;
  let moved: GameState;
  if (actionsRemaining > 0) {
    moved = {
      ...state,
      ships,
      movedThisPly: [...state.movedThisPly, shipId],
      actionsRemaining,
    };
  } else {
    const sideToMove = otherSide(state.sideToMove);
    moved = {
      ...state,
      ships,
      sideToMove,
      actionsRemaining: ACTIONS_PER_PLY,
      movedThisPly: [],
    };
    effects.push({ type: "ply-ended", sideToMove });
  }

  const { state: settled, effect: passEffect } = applyPassGuard(moved);
  if (passEffect !== undefined) {
    effects.push(passEffect);
  }

  return { outcome: "applied", state: settled, effects };
}
