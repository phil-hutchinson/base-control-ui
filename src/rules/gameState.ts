// The state of a game in progress (rules.md §5, §8.1) and the position it
// starts from. Plain readonly data throughout: no classes, no methods, no
// stored Map or Set. Occupancy is never stored — build a ship index with
// `shipsBySquare` at the point of use instead.

import { type Square, squareName } from "./board";
import {
  DEFAULT_FLEET_SIZE,
  isFleetSize,
  startingFleet,
  type Side,
  type ShipId,
} from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS, isGameLengthRounds } from "./gameLength";
import type { PowerLevel } from "./power";
import { dealOpeningBoard, type SiteState } from "./sites";

/** How many actions a side takes each ply (rules.md §5). */
export const ACTIONS_PER_PLY = 1;

/** One ship: its stable identity, side, current square and power level. */
export interface Ship {
  readonly id: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
}

/**
 * A site's current state, plus its `level` — a single number whose meaning
 * depends on the state it is attached to (rules.md §8.1–§8.3):
 *
 * | State   | `level` is           | Starts at             | Moves at end of turn | Changes state at |
 * | ------- | --------------------- | ---------------------- | --------------------- | ----------------- |
 * | Active  | pressure               | 1                       | +1, capped at 50      | drawn (§8.2)       |
 * | Charged | drain                  | 0                       | + the drain draw      | ≥ capacity         |
 * | Dormant | the drain to recover   | the drain it carried    | − the recovery draw   | ≤ 0                |
 *
 * A dormant site's `level` carries over from whatever drain the node had
 * when it went dormant — always at or a little past capacity, since a node
 * now ends only that way — so recovery always starts from about the same
 * level. That carry is a real property of the design, not an implementation
 * convenience, and is why there is one field rather than three.
 */
export interface SiteStatus {
  readonly state: SiteState;
  readonly level: number;
}

/** Each side's running energy total (rules.md §8.4). */
export type EnergyTotals = Readonly<Record<Side, number>>;

/** The state of a game in progress. */
export interface GameState {
  /** Every ship, in the starting fleet's clockwise order (`startingFleet`, rules.md §4). */
  readonly ships: readonly Ship[];
  /** Every site's current status, keyed by square name. */
  readonly siteStates: Readonly<Record<string, SiteStatus>>;
  /** The side whose ply it is. */
  readonly sideToMove: Side;
  /** How many of the ply's actions remain. */
  readonly actionsRemaining: number;
  /** The ids of the ships that have already acted this ply (never more than `ACTIONS_PER_PLY`). */
  readonly actedThisPly: readonly ShipId[];
  /** The ply currently being played, starting at 1. */
  readonly plyNumber: number;
  /** The 32-bit seed the next random draw will use (rules.md §8.2, §7.1). */
  readonly randomSeed: number;
  /** Each side's running energy total (rules.md §8.4), both starting at 0. */
  readonly energy: EnergyTotals;
  /**
   * The game's length in rounds (rules.md §9), fixed for the game's
   * lifetime once set by `startingGameState`. Every piece of round
   * arithmetic reads it from here rather than from a default, so a shorter
   * or longer game is a property of this state and not of the app. Neither
   * the current round nor whether the game is over is stored: both are
   * derived from `plyNumber` and this field at the point of use.
   */
  readonly lengthInRounds: number;
  /**
   * Which sides have run out of time (rules.md §10), both starting false.
   * This is a fact about the game, not about wall-clock time: the rules
   * layer never reads a clock, and never will. It is set, once, by an
   * intent the app dispatches when its own clock reaches zero — exactly as
   * an activation is an intent dispatched when a square is clicked. See
   * `markOutOfTime` below and `isGameOver` in `gameLength.ts`, which is
   * true once both sides carry this flag.
   */
  readonly outOfTime: Readonly<Record<Side, boolean>>;
}

/**
 * The state the game starts from: `startingFleet(fleetSize)`'s ships, a
 * dealt board (`dealOpeningBoard`, rules.md §8.1) — five of the seventeen
 * sites charged at a drawn drain, the rest active at a drawn pressure,
 * nothing dormant — green to move, `ACTIONS_PER_PLY` actions remaining,
 * nothing moved, ply 1, both sides at 0 energy, neither side out of time,
 * and the given game length.
 *
 * The seed argument is the seed the **deal** starts from, not the seed the
 * game's first turn draws from: dealing the board consumes 22 steps of the
 * stream before play begins, and the resulting state's `randomSeed` is the
 * seed the deal left behind. See `src/game/seed.ts` for where the app's
 * opening seed comes from. Every test passes one explicitly, so a game's
 * opening position is always reproducible.
 *
 * The game's length in rounds defaults to `DEFAULT_GAME_LENGTH_ROUNDS`
 * (rules.md §9) and, once set, is fixed for the game's lifetime. It must be
 * a positive whole number; anything else is a caller bug and throws a
 * `RangeError`.
 *
 * The fleet size (rules.md §4) defaults to `DEFAULT_FLEET_SIZE` and, like
 * the length, is fixed for the game's lifetime once set — it must be one of
 * `fleet.ts`'s valid fleet sizes, or this throws a `RangeError`. It is
 * **not** stored on the resulting state: `state.ships` is the record of it,
 * since a side's fleet size is simply the count of its ships.
 */
export function startingGameState(
  randomSeed: number,
  lengthInRounds: number = DEFAULT_GAME_LENGTH_ROUNDS,
  fleetSize: number = DEFAULT_FLEET_SIZE,
): GameState {
  if (!isGameLengthRounds(lengthInRounds)) {
    throw new RangeError(
      `startingGameState: lengthInRounds must be a positive integer, got ${lengthInRounds}`,
    );
  }
  if (!isFleetSize(fleetSize)) {
    throw new RangeError(
      `startingGameState: fleetSize must be 5, 6 or 7, got ${fleetSize}`,
    );
  }

  const [siteStates, nextSeed] = dealOpeningBoard(randomSeed);

  return {
    ships: startingFleet(fleetSize).map((entry) => ({
      id: entry.id,
      side: entry.side,
      square: entry.square,
      power: entry.power,
    })),
    siteStates,
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: nextSeed,
    energy: { green: 0, red: 0 },
    lengthInRounds,
    outOfTime: { green: false, red: false },
  };
}

/**
 * A state with the given side's clock marked as run out (rules.md §10).
 * Idempotent: if the side is already marked, the same state object is
 * returned, so a needless re-render is impossible.
 */
export function markOutOfTime(state: GameState, side: Side): GameState {
  if (state.outOfTime[side]) {
    return state;
  }
  return { ...state, outOfTime: { ...state.outOfTime, [side]: true } };
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

/** A square's full site status (state and level), or `undefined` if it is not a site. */
export function siteStatusAt(
  state: GameState,
  square: Square,
): SiteStatus | undefined {
  return state.siteStates[squareName(square)];
}

/**
 * The square names of every site that is `dormant` in the given state. Built
 * fresh from whatever state is handed to it.
 */
export function dormantSiteNames(state: GameState): ReadonlySet<string> {
  const names = new Set<string>();
  for (const [name, status] of Object.entries(state.siteStates)) {
    if (status.state === "dormant") {
      names.add(name);
    }
  }
  return names;
}
