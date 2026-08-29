// Movement (rules.md §6): a ship moves in a straight line, orthogonally or
// diagonally, as far as its shield count allows. `src/rules/moveLegality.ts`
// holds §6 itself — reach and occupancy, with no restriction on the
// destination site's state; this module layers §8.5's stranded-ship
// obligation on top of it. This is the only implementation of §6 in the app;
// every caller that needs a legal move or the reason one is refused calls the
// functions here.

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
import { strandedShipIds } from "./stranded";

export { reachFrom };
export type { MoveRefusalReason, ReachEntry };

/**
 * Why `destination` is not a legal move for `shipId` in the given state, as a
 * structured reason, or `undefined` when the move is legal. Reasons are
 * checked in order from the most fundamental (whether the game is even still
 * being played) to the most specific (the destination square itself):
 * whether the game is over, whose ship it is, whether it has already acted,
 * then §8.5's stranded-ship obligation — checked before anything about the
 * destination, because the objection is to the ship, not the square — and
 * finally §6's reach, occupancy and site-state checks.
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

  const owed = strandedShipIds(state);
  if (owed.length > 0 && !owed.includes(shipId)) {
    return "another-ship-stranded";
  }

  return sixOnlyMoveRefusalReason(state, shipId, destination);
}

/**
 * Every square `shipId` may legally move to in the given state: its §6 reach,
 * with §8.5's obligation applied at the ship level and the rest of the
 * filtering — occupancy and site state — delegated to
 * `sixOnlyLegalDestinations`. Empty once the game is over, when the ship does
 * not belong to the side to move, has already acted this ply, or is held
 * back by the obligation.
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

  const owed = strandedShipIds(state);
  if (owed.length > 0 && !owed.includes(shipId)) {
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
 * ship, under §6 alone. Used by the §5 pass guard, which must keep working
 * regardless of §8.5's obligation: the obligation only ever binds when at
 * least one ship with a legal move exists, so a side that can move at all can
 * still move.
 */
export function sideToMoveHasLegalMove(state: GameState): boolean {
  return eligibleShips(state).some(
    (ship) => sixOnlyLegalDestinations(state, ship.id).length > 0,
  );
}
