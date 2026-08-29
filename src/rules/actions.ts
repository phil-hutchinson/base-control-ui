// Actions at the §5 level (rules.md §5): an action is a move or an attack.
// `movement.ts` and `combat.ts` each answer "is this legal" for their own
// kind of action; this module is the only place that asks "is *any* action
// legal", which is genuinely neither §6's question nor §7's.

import { legalTargets, sevenOnlyLegalTargets } from "./combat";
import type { ShipId } from "./fleet";
import type { GameState } from "./gameState";
import { legalDestinations, sideToMoveHasLegalMove } from "./movement";

/**
 * Whether the side to move has any legal action at all — a legal move or a
 * legal attack target, with any ship that has not yet acted this ply —
 * judged by the §6-only and §7-only layers, which differ from the public
 * layers only in having no awareness of whether the game has ended. Used by
 * the §5 pass guard.
 */
export function sideToMoveHasLegalAction(state: GameState): boolean {
  if (sideToMoveHasLegalMove(state)) {
    return true;
  }

  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .some((ship) => sevenOnlyLegalTargets(state, ship.id).length > 0);
}

/**
 * Whether `shipId` has any legal action of its own: a legal move or a legal
 * attack target, judged by the public §6 and §7 layers. Used by the board
 * for the `no-action` condition; a ship that has already acted this ply
 * always answers false, since it has no legal move or attack target left to
 * offer.
 */
export function shipHasLegalAction(state: GameState, shipId: ShipId): boolean {
  return (
    legalDestinations(state, shipId).length > 0 ||
    legalTargets(state, shipId).length > 0
  );
}
