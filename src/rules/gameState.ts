// The state of a game in progress (rules.md §5, §8.1) and the position it
// starts from. Plain readonly data throughout: no classes, no methods, no
// stored Map or Set. Occupancy is never stored — build a ship index with
// `shipsBySquare` at the point of use instead.

import { ALL_SQUARES, type Square, squareName } from "./board";
import {
  DEFAULT_FLEET_SIZE,
  FLEET_SIZES,
  isFleetSize,
  startingFleet,
  type Side,
  type ShipId,
} from "./fleet";
import { DEFAULT_COMBAT_ENABLED } from "./combatSetting";
import { DEFAULT_GAME_LENGTH_ROUNDS, isGameLengthRounds } from "./gameLength";
import type { PowerLevel } from "./power";
import {
  CHARGED_NODE_COUNTS,
  dealOpeningBoard,
  DEFAULT_CHARGED_NODE_COUNT,
  isChargedNodeCount,
  type ChargedNodeCount,
  type NodeState,
} from "./nodes";
import {
  DEFAULT_NODE_ROTATION,
  isNodeRotationSetting,
  NODE_ROTATION_SETTINGS,
  type NodeRotationSetting,
} from "./nodeRotation";
import { dealBonusPlanets } from "./bonusPlanets";
import {
  DEFAULT_PLANET_BONUS,
  isPlanetBonusSetting,
  PLANET_BONUS_SETTINGS,
  type PlanetBonusSetting,
} from "./planetBonus";
import { placeRotators } from "./rotators";
import {
  DEFAULT_SCORING,
  isScoringSetting,
  SCORING_SETTINGS,
  type ScoringSetting,
} from "./scoring";

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

/**
 * One planet in a side's dealt bonus set (rules.md §3.4): the square, and,
 * once that side's ships have landed there, the ply the claim happened on.
 * `claimedOnPly` is undefined until claimed, and is a ply number rather than
 * a boolean so that whether to still show the amount or the settled
 * checkmark can be read straight off the state, with no timer and no
 * component state needed to remember when a claim happened.
 */
export interface BonusPlanetEntry {
  readonly square: Square;
  readonly claimedOnPly?: number;
}

/** The state of a game in progress. */
export interface GameState {
  /** Every ship, in the starting fleet's clockwise order (`startingFleet`, rules.md §4). */
  readonly ships: readonly Ship[];
  /** Every node's current status, keyed by square name. */
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  /** The side whose ply it is. */
  readonly sideToMove: Side;
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
   * How many nodes the board keeps charged (rules.md §8.1), fixed for the
   * game's lifetime once set by `startingGameState`. Every piece of
   * charging arithmetic — the opening deal and every turn's shortfall —
   * reads it from here rather than from a constant. It cannot be derived
   * from `state.nodes` the way a fleet size is derived from `state.ships`:
   * a board that is legitimately one node short of it, mid-sequence, would
   * have the count derived wrong.
   */
  readonly chargedNodeCount: ChargedNodeCount;
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
  /**
   * Whether combat (rules.md §7) is on for this game, fixed for the game's
   * lifetime once set by `startingGameState`. Every place that decides
   * whether an attack is legal reads it from here rather than from an app
   * default. It cannot be derived from `state.ships` or `state.nodes` the
   * way a fleet size is derived from the ship list: a board with no fights
   * on it is indistinguishable from one whose players simply have not
   * fought yet.
   */
  readonly combatEnabled: boolean;
  /**
   * The scoring setting (rules.md §8.4), fixed for the game's lifetime
   * once set by `startingGameState`. Every place that prices a collection
   * reads it from here rather than from an app default. It cannot be
   * derived from a board: a board carries no record of what its turns
   * paid, and a total of 6 is three turns at simple or one at bonus.
   */
  readonly scoring: ScoringSetting;
  /**
   * How the three inactive nodes' priorities rotate (rules.md §8.2), fixed
   * for the game's lifetime once set by `startingGameState`. Every place
   * that rotates the queue — `endOfTurn.ts` step 5, and a landing in
   * `ply.ts` — reads it from here rather than from an app default. It
   * cannot be derived from a board: a board that has not rotated for ten
   * turns is indistinguishable from one whose players simply have not
   * landed anywhere.
   */
  readonly nodeRotation: NodeRotationSetting;
  /**
   * Every square currently holding a rotator (rules.md §3.3), in board
   * order, fixed only at the moment it is set — the opening deal, and every
   * refill under the dedicated setting (`endOfTurn.ts` step 5). Always empty
   * under continuous and planet. Deliberately not part of `state.nodes`: a
   * rotator has no state, no countdown and no priority, and it cannot be
   * derived from the board either — a free square and a free square holding
   * a rotator look identical.
   */
  readonly rotators: readonly Square[];
  /**
   * The planet bonus setting (rules.md §3.4), fixed for the game's lifetime
   * once set by `startingGameState`. Every place that decides whether a
   * landing pays reads it from here rather than from an app default. It
   * cannot be derived from a board or from `bonusPlanets` below: an off game
   * and an on game that happens to have claimed nothing yet look identical
   * on the board.
   */
  readonly planetBonus: PlanetBonusSetting;
  /**
   * Each side's three dealt bonus planets (rules.md §3.4), fixed for the
   * game's lifetime once dealt by `startingGameState`. Both sides' lists are
   * empty when `planetBonus` is off. See `BonusPlanetEntry` for why an
   * entry's claim is recorded as a ply number rather than a boolean.
   */
  readonly bonusPlanets: Readonly<Record<Side, readonly BonusPlanetEntry[]>>;
}

/**
 * The options `startingGameState` accepts beyond the seed, each fixed for
 * the game's lifetime once set. All are optional and fall back to the
 * app's defaults.
 */
export interface StartingGameStateOptions {
  /**
   * The game's length in rounds (rules.md §9). Defaults to
   * `DEFAULT_GAME_LENGTH_ROUNDS`. Must be a positive whole number; anything
   * else is a caller bug and throws a `RangeError`.
   */
  readonly lengthInRounds?: number;
  /**
   * The fleet size (rules.md §4). Defaults to `DEFAULT_FLEET_SIZE`. Must be
   * one of `fleet.ts`'s valid fleet sizes, or this throws a `RangeError`. It
   * is **not** stored on the resulting state: `state.ships` is the record of
   * it, since a side's fleet size is simply the count of its ships.
   */
  readonly fleetSize?: number;
  /**
   * How many nodes the board keeps charged (rules.md §8.1). Defaults to
   * `DEFAULT_CHARGED_NODE_COUNT`. Must be one of `nodes.ts`'s offered
   * charged-node counts, or this throws a `RangeError`. Stored on the
   * resulting state as `chargedNodeCount`, unlike `fleetSize`, because it
   * cannot be derived back from the dealt board.
   */
  readonly chargedNodeCount?: number;
  /**
   * Whether combat (rules.md §7) is on for this game. Defaults to
   * `DEFAULT_COMBAT_ENABLED` (off). Unlike its three neighbours above, this
   * is **not** validated at runtime: those are typed `number` and so admit
   * values the game does not offer, but a `boolean` admits only the two
   * settings the game offers, so there is nothing for a `RangeError` to
   * reject.
   */
  readonly combatEnabled?: boolean;
  /**
   * The scoring setting (rules.md §8.4). Defaults to `DEFAULT_SCORING`
   * (simple). Deliberately typed `string`, not `ScoringSetting`: a setting
   * arriving from outside the type system — a saved options blob, a game
   * record, a URL — can be any string, unlike `combatEnabled`'s boolean,
   * which admits only the two settings the game offers and so has nothing
   * to reject. Must be one of `scoring.ts`'s offered settings, or this
   * throws a `RangeError`.
   */
  readonly scoring?: string;
  /**
   * How the three inactive nodes' priorities rotate (rules.md §8.2).
   * Defaults to `DEFAULT_NODE_ROTATION` (continuous). Deliberately typed
   * `string`, not `NodeRotationSetting`, for the same reason `scoring` is: a
   * setting arriving from outside the type system can be any string. Must be
   * one of `nodeRotation.ts`'s offered settings, or this throws a
   * `RangeError`. `rotators` is not an option — it is produced by the deal,
   * never supplied.
   */
  readonly nodeRotation?: string;
  /**
   * The planet bonus setting (rules.md §3.4). Defaults to
   * `DEFAULT_PLANET_BONUS` (off). Deliberately typed `string`, not
   * `PlanetBonusSetting`, for the same reason `scoring` and `nodeRotation`
   * are: a setting arriving from outside the type system can be any string.
   * Must be one of `planetBonus.ts`'s offered settings, or this throws a
   * `RangeError`. `bonusPlanets` is not an option — it is produced by the
   * deal, never supplied.
   */
  readonly planetBonus?: string;
}

/**
 * The state the game starts from: `startingFleet(fleetSize)`'s ships, a
 * dealt board (`dealOpeningBoard`, rules.md §8.1) — the chosen number of
 * nodes charged at baseline, with no countdown, the other three inactive at
 * priorities 1, 2 and 3 dealt at random, nothing depleted — green to move,
 * ply 1, both sides at 0 energy, neither side out of time, and the given
 * game length.
 *
 * The fleet is built before the deal so its ships' squares can be passed to
 * `dealOpeningBoard`, which excludes them from where a node may appear;
 * building the fleet draws no randomness, so the seeded stream is
 * unaffected.
 *
 * The seed argument is the seed the **deal** starts from, not the seed the
 * game's first turn draws from: dealing the board consumes `chargedNodeCount
 * + 4` steps of the stream before play begins — nine at five charged, eight
 * at four, seven at three — plus, under the dedicated node rotation setting
 * only, up to eight more for the opening rotator set (rules.md §3.3), plus,
 * when the planet bonus is on, exactly six more for the bonus planet deal
 * (rules.md §3.4), drawn last so an off game spends nothing extra. The
 * resulting state's `randomSeed` is the seed all of that left behind. That
 * argument is also recorded verbatim as `openingSeed`, so the state
 * remembers where its deal started even once `randomSeed` has moved on. See
 * `src/game/seed.ts` for where the app's opening seed comes from. Every test
 * passes one explicitly, so a game's opening position is always
 * reproducible.
 *
 * `options` carries everything else, each optional and documented on
 * `StartingGameStateOptions` — see there for the fields and their defaults
 * and validation.
 */
export function startingGameState(
  randomSeed: number,
  options: StartingGameStateOptions = {},
): GameState {
  const {
    lengthInRounds = DEFAULT_GAME_LENGTH_ROUNDS,
    fleetSize = DEFAULT_FLEET_SIZE,
    chargedNodeCount = DEFAULT_CHARGED_NODE_COUNT,
    combatEnabled = DEFAULT_COMBAT_ENABLED,
    scoring = DEFAULT_SCORING,
    nodeRotation = DEFAULT_NODE_ROTATION,
    planetBonus = DEFAULT_PLANET_BONUS,
  } = options;

  if (!isGameLengthRounds(lengthInRounds)) {
    throw new RangeError(
      `startingGameState: lengthInRounds must be a positive integer, got ${lengthInRounds}`,
    );
  }
  if (!isFleetSize(fleetSize)) {
    throw new RangeError(
      `startingGameState: fleetSize must be one of ${FLEET_SIZES.join(", ")}, got ${fleetSize}`,
    );
  }
  if (!isChargedNodeCount(chargedNodeCount)) {
    throw new RangeError(
      `startingGameState: chargedNodeCount must be one of ${CHARGED_NODE_COUNTS.join(", ")}, got ${chargedNodeCount}`,
    );
  }
  if (!isScoringSetting(scoring)) {
    throw new RangeError(
      `startingGameState: scoring must be one of ${SCORING_SETTINGS.join(", ")}, got ${scoring}`,
    );
  }
  if (!isNodeRotationSetting(nodeRotation)) {
    throw new RangeError(
      `startingGameState: nodeRotation must be one of ${NODE_ROTATION_SETTINGS.join(", ")}, got ${nodeRotation}`,
    );
  }
  if (!isPlanetBonusSetting(planetBonus)) {
    throw new RangeError(
      `startingGameState: planetBonus must be one of ${PLANET_BONUS_SETTINGS.join(", ")}, got ${planetBonus}`,
    );
  }

  const ships = startingFleet(fleetSize).map((entry) => ({
    id: entry.id,
    side: entry.side,
    square: entry.square,
    power: entry.power,
  }));

  const shipSquares = ships.map((ship) => ship.square);
  const [nodes, dealtSeed] = dealOpeningBoard(
    shipSquares,
    chargedNodeCount,
    randomSeed,
  );

  const dealtNodeSquares = ALL_SQUARES.filter(
    (square) => nodes[squareName(square)] !== undefined,
  );
  const [rotators, seedAfterRotators] =
    nodeRotation === "dedicated"
      ? placeRotators(dealtNodeSquares, shipSquares, dealtSeed)
      : [[], dealtSeed];

  const [bonusPlanets, nextSeed]: [
    Readonly<Record<Side, readonly BonusPlanetEntry[]>>,
    number,
  ] =
    planetBonus === "off"
      ? [{ green: [], red: [] }, seedAfterRotators]
      : ((): [Readonly<Record<Side, readonly BonusPlanetEntry[]>>, number] => {
          const [dealt, seedAfterDeal] = dealBonusPlanets(seedAfterRotators);
          return [
            {
              green: dealt.green.map((square) => ({ square })),
              red: dealt.red.map((square) => ({ square })),
            },
            seedAfterDeal,
          ];
        })();

  return {
    ships,
    nodes,
    sideToMove: "green",
    plyNumber: 1,
    randomSeed: nextSeed,
    openingSeed: randomSeed,
    energy: { green: 0, red: 0 },
    lengthInRounds,
    chargedNodeCount,
    outOfTime: { green: false, red: false },
    combatEnabled,
    scoring,
    nodeRotation,
    rotators,
    planetBonus,
    bonusPlanets,
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
