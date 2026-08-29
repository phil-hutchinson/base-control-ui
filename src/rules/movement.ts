// Movement (rules.md §6): a ship moves in a straight line, orthogonally or
// diagonally, as far as its shield count allows. `src/rules/moveLegality.ts`
// holds §6 itself — reach and occupancy, with no restriction on the
// destination site's state; this module layers §9's game-over check on top
// of it. This is the only implementation of §6 in the app; every caller that
// needs a legal move or the reason one is refused calls the functions here.

import type { Square } from "./board";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import type { GameState, Ship } from "./gameState";
import {
  findShip,
  type MoveRefusalReason,
  type ReachEntry,
  reachFrom,
  sixOnlyLegalDestinations,
  sixOnlyMoveRefusalReason,
} from "./moveLegality";

export { reachFrom };
export type { MoveRefusalReason, ReachEntry };

/**
 * Why `destination` is not a legal move for `shipId` in the given state, as a
 * structured reason, or `undefined` when the move is legal. Reasons are
 * checked in order from the most fundamental (whether the game is even still
 * being played) to the most specific (the destination square itself):
 * whether the game is over, whose ship it is, whether it has already acted,
 * and finally §6's reach, occupancy and site-state checks.
 *
 * The game-over check is deliberately absent from `sixOnlyMoveRefusalReason`
 * — that layer exists so the §5 pass guard can ask "is any action legal
 * here" without this question answering it; see `applyPassGuard` in
 * `ply.ts`.
 */
export function moveRefusalReason(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): MoveRefusalReason | undefined {
  if (isGameOver(state)) {
    return "game-over";
  }

  const ship = findShip(state, shipId);

  if (ship.side !== state.sideToMove) {
    return "not-your-ship";
  }
  if (state.actedThisPly.includes(shipId)) {
    return "ship-already-acted";
  }

  return sixOnlyMoveRefusalReason(state, shipId, destination);
}

/**
 * Every square `shipId` may legally move to in the given state: its §6
 * reach, with occupancy and site state filtered by `sixOnlyLegalDestinations`.
 * Empty once the game is over, or when the ship does not belong to the side
 * to move or has already acted this ply.
 */
export function legalDestinations(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  if (isGameOver(state)) {
    return [];
  }

  const ship = findShip(state, shipId);
  if (ship.side !== state.sideToMove || state.actedThisPly.includes(shipId)) {
    return [];
  }

  return sixOnlyLegalDestinations(state, shipId);
}

/**
 * The ships of the side to move that have not yet acted this ply, and so are
 * still eligible to take a move action.
 */
function eligibleShips(state: GameState): readonly Ship[] {
  return state.ships.filter(
    (ship) =>
      ship.side === state.sideToMove && !state.actedThisPly.includes(ship.id),
  );
}

/**
 * Whether the side to move has any legal move at all, with any eligible
 * ship, under §6 alone. Used by the §5 pass guard.
 */
export function sideToMoveHasLegalMove(state: GameState): boolean {
  return eligibleShips(state).some(
    (ship) => sixOnlyLegalDestinations(state, ship.id).length > 0,
  );
}
