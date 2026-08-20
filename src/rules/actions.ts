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
 * legal attack target, with any ship that has not yet acted this ply (rules.md
 * §5 permits at most one action per ship per turn) — judged by the §6-only
 * and §7-only layers, with no awareness of §8.5's stranded-ship obligation.
 * Used by the §5 pass guard, which must keep working regardless of the
 * obligation: the obligation only ever binds when at least one ship has a
 * legal §6 move, so a side that is obliged always has an action available
 * (the same reasoning `sideToMoveHasLegalMove` already relies on, which this
 * is built on top of).
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
 * attack target, judged by the public §6 and §7 layers, so §8.5's obligation
 * applies. Used by the board for the `no-action` condition; a ship that has
 * already acted this ply always answers false, since §5 permits at most one
 * action per ship per turn.
 */
export function shipHasLegalAction(state: GameState, shipId: ShipId): boolean {
  return (
    legalDestinations(state, shipId).length > 0 ||
    legalTargets(state, shipId).length > 0
  );
}
