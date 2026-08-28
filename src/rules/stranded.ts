// Stranded ships (rules.md §8.5): a ship still standing on an active or
// dormant site owes its owner an action to move it clear. This module
// answers which of the side to move's ships currently owe one, and whether
// that obligation binds the action about to be taken. Both are derived fresh
// from the state every time they are asked, never cached, so they stay
// correct as actions are spent within a ply.

import type { ShipId } from "./fleet";
import { type GameState, siteStateAt } from "./gameState";
import { sixOnlyLegalDestinations } from "./moveLegality";

const STRANDING_SITE_STATES = new Set(["active", "dormant"]);

/**
 * The ids of the side to move's ships that owe an action: standing on an
 * active or dormant site, not yet acted this ply, and with at least one
 * legal move available under §6 alone. A stranded ship with no legal move at
 * all is left out — §8.5 waives the requirement rather than obliging the
 * player to shuffle blockers aside.
 */
export function strandedShipIds(state: GameState): readonly ShipId[] {
  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .filter((ship) => !state.actedThisPly.includes(ship.id))
    .filter((ship) => {
      const siteState = siteStateAt(state, ship.square);
      return siteState !== undefined && STRANDING_SITE_STATES.has(siteState);
    })
    .filter((ship) => sixOnlyLegalDestinations(state, ship.id).length > 0)
    .map((ship) => ship.id);
}

/**
 * Whether §8.5's obligation binds the action about to be taken: true
 * whenever any ship owes an action. The obligation binds every action of the
 * turn while any ship still owes one, so a player frees one stranded ship
 * per turn and any others wait for later turns.
 */
export function strandedObligationBinds(state: GameState): boolean {
  return strandedShipIds(state).length > 0;
}
