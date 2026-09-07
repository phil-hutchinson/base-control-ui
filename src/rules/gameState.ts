// The state of a game in progress (rules.md §5, §8.1) and the position it
// starts from. Plain readonly data throughout: no classes, no methods, no
// stored Map or Set. Occupancy is never stored — build a ship index with
// `shipsBySquare` at the point of use instead.

import { ALL_SQUARES, type Square, squareName } from "./board";
import {
  DEFAULT_FLEET_SIZE,
  isFleetSize,
  startingFleet,
  type Side,
  type ShipId,
} from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS, isGameLengthRounds } from "./gameLength";
import type { PowerLevel } from "./power";
import { dealOpeningBoard, type NodeState } from "./nodes";

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
 * A node's current state, plus its `level` — a single number whose meaning
 * depends on the state it is attached to (rules.md §8.1–§8.3):
 *
 * | State    | `level` is           | Set to                                                | At the end of a ply             | Changes state at |
 * | -------- | --------------------- | ------------------------------------------------------ | -------------------------------- | ------------------ |
 * | Inactive | priority (1, 2 or 3)  | dealt at random by a refill                             | rotates 1→2, 2→3, 3→1, or swept  | charged (§8.2)      |
 * | Charged  | plies remaining        | **0** on charging or dealing; 11 when a ship steps on   | −1, but only if above 0          | depleted at 0       |
 * | Depleted | plies remaining        | 11 (trap) or 2 (exit)                                   | −1                                | retires at 0        |
 *
 * `level === 0` on a charged node means "no countdown" — a charged node
 * nobody has stepped on sits there indefinitely (rules.md §8.3). This is
 * unambiguous: a countdown that reaches 0 depletes the node inside the same
 * step (`endOfTurn.ts` step 3), so a charged node never sits at 0 with a
 * countdown that has simply run out. `countdown.ts` owns the arithmetic on
 * this field for the charged and depleted states; `nodeQueue.ts` owns the
 * type (`NodePriority`) for the inactive state.
 */
export interface NodeStatus {
  readonly state: NodeState;
  readonly level: number;
}

/** Each side's running energy total (rules.md §8.4). */
export type EnergyTotals = Readonly<Record<Side, number>>;

/** The state of a game in progress. */
export interface GameState {
  /** Every ship, in the starting fleet's clockwise order (`startingFleet`, rules.md §4). */
  readonly ships: readonly Ship[];
  /** Every node's current status, keyed by square name. */
  readonly nodes: Readonly<Record<string, NodeStatus>>;
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
  /**
   * The 32-bit seed the opening deal started from — distinct from
   * `randomSeed`, which is the seed the deal left behind and the next draw
   * will use. Fixed for the game's lifetime once set by `startingGameState`;
   * nothing in the rules layer reads it, but a game record wants it, and the
   * board layer derives the planet arrangement from it.
   */
  readonly openingSeed: number;
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
 * dealt board (`dealOpeningBoard`, rules.md §8.1) — four of the seven nodes
 * charged at a drawn drain, the other three inactive at priorities 1, 2 and
 * 3 dealt at random, nothing depleted — green to move, `ACTIONS_PER_PLY`
 * actions remaining, nothing moved, ply 1, both sides at 0 energy, neither
 * side out of time, and the given game length.
 *
 * The fleet is built before the deal so its ships' squares can be passed to
 * `dealOpeningBoard`, which excludes them from where a node may appear;
 * building the fleet draws no randomness, so the seeded stream is
 * unaffected.
 *
 * The seed argument is the seed the **deal** starts from, not the seed the
 * game's first turn draws from: dealing the board consumes 12 steps of the
 * stream before play begins, and the resulting state's `randomSeed` is the
 * seed the deal left behind. That argument is also recorded verbatim as
 * `openingSeed`, so the state remembers where its deal started even once
 * `randomSeed` has moved on. See `src/game/seed.ts` for where the app's
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
      `startingGameState: fleetSize must be 5 or 6, got ${fleetSize}`,
    );
  }

  const ships = startingFleet(fleetSize).map((entry) => ({
    id: entry.id,
    side: entry.side,
    square: entry.square,
    power: entry.power,
  }));

  const [nodes, nextSeed] = dealOpeningBoard(
    ships.map((ship) => ship.square),
    randomSeed,
  );

  return {
    ships,
    nodes,
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: nextSeed,
    openingSeed: randomSeed,
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

/** A square's node state in the given game state, or `undefined` if it is not a node. */
export function nodeStateAt(
  state: GameState,
  square: Square,
): NodeState | undefined {
  return state.nodes[squareName(square)]?.state;
}

/** A square's full node status (state and level), or `undefined` if it is not a node. */
export function nodeStatusAt(
  state: GameState,
  square: Square,
): NodeStatus | undefined {
  return state.nodes[squareName(square)];
}

/**
 * Every square that currently holds a node, in board order. Built by
 * walking `ALL_SQUARES` and keeping the ones present in `state.nodes` —
 * never by reading `Object.keys(state.nodes)`, whose order records the
 * history of which square was written when, not a property of the board.
 * Callers that iterate the node set and consume the seeded random stream as
 * they go rely on this order being independent of how the game got here.
 */
export function nodeSquares(state: GameState): readonly Square[] {
  return ALL_SQUARES.filter(
    (square) => state.nodes[squareName(square)] !== undefined,
  );
}
