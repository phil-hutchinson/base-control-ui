// The state of a game in progress (rules.md §5, §8.1) and the position it
// starts from. Plain readonly data throughout: no classes, no methods, no
// stored Map or Set. Occupancy is never stored — build a ship index with
// `shipsBySquare` at the point of use instead.

import { type Square, squareName } from "./board";
import { STARTING_FLEET, type Side, type ShipId } from "./fleet";
import { SITES, type SiteState, startingSiteState } from "./sites";
import type { ShieldCount } from "./shields";

/** How many actions a side takes each ply (rules.md §5). */
export const ACTIONS_PER_PLY = 2;

/** One ship: its stable identity, side, current square and shield count. */
export interface Ship {
  readonly id: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly shields: ShieldCount;
}

/** The state of a game in progress. */
export interface GameState {
  /** Every ship, in `STARTING_FLEET` order. */
  readonly ships: readonly Ship[];
  /** Every site's current state, keyed by square name. */
  readonly siteStates: Readonly<Record<string, SiteState>>;
  /** The side whose ply it is. */
  readonly sideToMove: Side;
  /** How many of the ply's two actions remain. */
  readonly actionsRemaining: number;
  /** The ids of the ships that have already moved this ply (never more than two). */
  readonly movedThisPly: readonly ShipId[];
}

/**
 * The state the game starts from: the fourteen `STARTING_FLEET` ships, every
 * site's starting state, green to move, two actions remaining, nothing
 * moved.
 */
export function startingGameState(): GameState {
  const siteStates: Record<string, SiteState> = {};
  for (const site of SITES) {
    const state = startingSiteState(site);
    if (state !== undefined) {
      siteStates[squareName(site)] = state;
    }
  }

  return {
    ships: STARTING_FLEET.map((entry) => ({
      id: entry.id,
      side: entry.side,
      square: entry.square,
      shields: entry.shields,
    })),
    siteStates,
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    movedThisPly: [],
  };
}

/** A square-name-keyed index of a state's ships, built at the point of use. */
export function shipsBySquare(state: GameState): ReadonlyMap<string, Ship> {
  return new Map(state.ships.map((ship) => [squareName(ship.square), ship]));
}

/** A square's site state in the given game state, or `undefined` if it is not a site. */
export function siteStateAt(
  state: GameState,
  square: Square,
): SiteState | undefined {
  return state.siteStates[squareName(square)];
}
