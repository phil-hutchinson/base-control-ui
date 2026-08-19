// The state of a game in progress (rules.md §5, §8.1) and the position it
// starts from. Plain readonly data throughout: no classes, no methods, no
// stored Map or Set. Occupancy is never stored — build a ship index with
// `shipsBySquare` at the point of use instead.

import { type Square, squareName } from "./board";
import { STARTING_RETURN_POSITION_INDEX } from "./bays";
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

/**
 * A site's current state, plus the ply number on which it entered that
 * state. Recorded for every site in every state, not only charged and
 * depleted ones, so the fact is never missing; only the charged (§8.3) and
 * depleted (§8.6) derivations consult it.
 */
export interface SiteStatus {
  readonly state: SiteState;
  readonly enteredOnPly: number;
}

/** The state of a game in progress. */
export interface GameState {
  /** Every ship, in `STARTING_FLEET` order. */
  readonly ships: readonly Ship[];
  /** Every site's current status, keyed by square name. */
  readonly siteStates: Readonly<Record<string, SiteStatus>>;
  /** The side whose ply it is. */
  readonly sideToMove: Side;
  /** How many of the ply's two actions remain. */
  readonly actionsRemaining: number;
  /** The ids of the ships that have already moved this ply (never more than two). */
  readonly movedThisPly: readonly ShipId[];
  /** The ply currently being played, starting at 1. */
  readonly plyNumber: number;
  /** The 32-bit seed the next random draw will use (rules.md §8.6). */
  readonly randomSeed: number;
  /**
   * An index into `CLOCKWISE_BAYS` naming return position 1 (rules.md §7.1)
   * for the ply being played. Position 1 itself is
   * `CLOCKWISE_BAYS[returnPositionIndex]`; the bay a beaten ship actually
   * lands in depends on which bays are occupied right now and is derived
   * from that occupancy at the point of use — it is never stored here.
   */
  readonly returnPositionIndex: number;
}

/**
 * The state the game starts from: the fourteen `STARTING_FLEET` ships, every
 * site's starting state (none entered during a ply, so `enteredOnPly` is 0),
 * green to move, two actions remaining, nothing moved, ply 1, and the given
 * seed.
 *
 * The seed is a required argument — see `src/game/seed.ts` for where the
 * app's opening seed comes from. Every test passes one explicitly, so a
 * game's opening position is always reproducible.
 */
export function startingGameState(randomSeed: number): GameState {
  const siteStates: Record<string, SiteStatus> = {};
  for (const site of SITES) {
    const state = startingSiteState(site);
    if (state !== undefined) {
      siteStates[squareName(site)] = { state, enteredOnPly: 0 };
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
    plyNumber: 1,
    randomSeed,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
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
  return state.siteStates[squareName(square)]?.state;
}

/** A square's full site status (state and the ply it entered it), or `undefined` if it is not a site. */
export function siteStatusAt(
  state: GameState,
  square: Square,
): SiteStatus | undefined {
  return state.siteStates[squareName(square)];
}
