// Stranded ships (rules.md §8.5): a ship still standing on a dormant or
// depleted site owes its owner an action to move it clear. This module
// answers which of the side to move's ships currently owe one, and whether
// that obligation binds the action about to be taken. Both are derived fresh
// from the state every time they are asked, never cached, so they stay
// correct as actions are spent within a ply.

import type { ShipId } from "./fleet";
import { type GameState, siteStateAt } from "./gameState";
import { sixOnlyLegalDestinations } from "./movement";

const STRANDING_SITE_STATES = new Set(["dormant", "depleted"]);

/**
 * The ids of the side to move's ships that owe an action: standing on a
 * dormant or depleted site, not yet moved this ply, and with at least one
 * legal move available under §6 alone. A stranded ship with no legal move at
 * all is left out — §8.5 waives the requirement rather than obliging the
 * player to shuffle blockers aside.
 */
export function strandedShipIds(state: GameState): readonly ShipId[] {
  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .filter((ship) => !state.movedThisPly.includes(ship.id))
    .filter((ship) => {
      const siteState = siteStateAt(state, ship.square);
      return siteState !== undefined && STRANDING_SITE_STATES.has(siteState);
    })
    .filter((ship) => sixOnlyLegalDestinations(state, ship.id).length > 0)
    .map((ship) => ship.id);
}

/**
 * Whether §8.5's obligation binds the action about to be taken: true once
 * the number of ships that owe an action is at least the number of actions
 * remaining this ply. One stranded ship leaves the first action free and
 * binds the second; two bind both; three or more mean the player clears two
 * of their choice this turn and the rest wait for the next.
 */
export function strandedObligationBinds(state: GameState): boolean {
  return strandedShipIds(state).length >= state.actionsRemaining;
}
