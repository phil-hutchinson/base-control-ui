// Whether a side, or a ship, can move or attack at all (rules.md §5).
// `movement.ts` and `combat.ts` each answer "is this legal" for their own
// kind of action; this module is the only place that asks whether either
// kind is possible at all, which is genuinely neither §6's question nor
// §7's, and keeping it separate is what stops `movement.ts` and `combat.ts`
// importing each other.

import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import type { GameState } from "./gameState";
import { legalDestinations, sideToMoveHasLegalMove } from "./movement";

/**
 * Whether the side to move can move or attack at all — a legal move or a
 * legal attack target, with any of its ships. Used by the §5 pass guard.
 *
 * This is safe to call once the game has ended: `sideToMoveHasLegalMove` and
 * `legalTargets` both answer with nothing for an ended game (rules.md §9),
 * so this answers `false`. That does not, by itself, make an ended game pass
 * plies forever — `applyPassGuard` in `ply.ts` checks `isGameOver` first and
 * returns the state untouched before it ever asks this question, and that
 * early return must stay.
 */
export function sideToMoveCanMoveOrAttack(state: GameState): boolean {
  if (sideToMoveHasLegalMove(state)) {
    return true;
  }

  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .some((ship) => legalTargets(state, ship.id).length > 0);
}

/**
 * Whether `shipId` can move or attack at all: a legal move or a legal
 * attack target of its own. Used by the board for the `cannot-move-or-attack`
 * condition.
 */
export function shipCanMoveOrAttack(state: GameState, shipId: ShipId): boolean {
  return (
    legalDestinations(state, shipId).length > 0 ||
    legalTargets(state, shipId).length > 0
  );
}
