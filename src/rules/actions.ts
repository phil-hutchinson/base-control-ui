// Actions at the §5 level (rules.md §5): an action is a move or an attack.
// `movement.ts` and `combat.ts` each answer "is this legal" for their own
// kind of action; this module is the only place that asks "is *any* action
// legal", which is genuinely neither §6's question nor §7's.

import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import type { GameState } from "./gameState";
import { legalDestinations, sideToMoveHasLegalMove } from "./movement";

/**
 * Whether the side to move has any legal action at all — a legal move or a
 * legal attack target, with any ship that has not yet acted this ply. Used
 * by the §5 pass guard.
 *
 * This is safe to call once the game has ended: `sideToMoveHasLegalMove` and
 * `legalTargets` both answer with nothing for an ended game (rules.md §9),
 * so this answers `false`. That does not, by itself, make an ended game pass
 * plies forever — `applyPassGuard` in `ply.ts` checks `isGameOver` first and
 * returns the state untouched before it ever asks this question, and that
 * early return must stay.
 */
export function sideToMoveHasLegalAction(state: GameState): boolean {
  if (sideToMoveHasLegalMove(state)) {
    return true;
  }

  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .some((ship) => legalTargets(state, ship.id).length > 0);
}

/**
 * Whether `shipId` has any legal action of its own: a legal move or a legal
 * attack target. Used by the board for the `no-action` condition; a ship
 * that has already acted this ply always answers false, since it has no
 * legal move or attack target left to offer.
 */
export function shipHasLegalAction(state: GameState, shipId: ShipId): boolean {
  return (
    legalDestinations(state, shipId).length > 0 ||
    legalTargets(state, shipId).length > 0
  );
}
