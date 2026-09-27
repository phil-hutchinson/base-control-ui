// The advanced planet bonus setting's own rules (steal.md §10): the six
// kinds and their weights, the point table, availability, the weighted kind
// draw, the uniform planet draw, the opening deal of the pair and the claim
// resolution. A leaf module over `gameState.ts`'s `NodeStatus` and `Ship`
// (types only — the same cycle `steal.ts` already carries with
// `gameState.ts`), `steal.ts`'s node-changing bonus effects, `fleet.ts`'s
// `Side` and `ShipId`, `nodes.ts`'s `ChargedNodeCount`, `planets.ts`'s
// `PLANETS`, `playerMatching.ts`'s `PlayerMatchingSetting`, `power.ts`'s
// `gainPower`, `scoring.ts`'s `ScoringSetting` and `random.ts`'s draws.
// `ply.ts` calls `resolveAdvancedBonusClaim` when a landing claims a bonus,
// and this module only ever changes the fields the claim touches — nodes,
// ships, the bonus pair and the seed — leaving everything else (whose ply it
// is, energy other than the claim's own payout, and so on) to `ply.ts`.
//
// The opening deal (steal.md §10) consumes exactly four seed steps, in this
// fixed order, after the steal opening deal has run and before play begins:
// slot 0's planet (uniform over all twelve planets), slot 1's planet
// (uniform over the eleven left), slot 0's kind (weighted, no exclusions),
// slot 1's kind (weighted, excluding slot 0's kind). `gameState.ts` calls
// `dealAdvancedBonuses` for this.
//
// A claim (steal.md §10) consumes, in this fixed order: (1) the claimed
// kind's own draws — none for a points kind or Fuel, one per square
// Additional nodes or Node scramble adds (`addExtraProspectiveSquares`,
// `scrambleProspectiveSquares`); (2) one step for the surviving bonus's new
// kind, excluding the kind it was; (3) one step for the new bonus's planet,
// drawn from planets empty at that moment and not the survivor's; (4) one
// step for the new bonus's kind, excluding the survivor's new kind.
// `resolveAdvancedBonusClaim` runs all four.
//
// Every kind draw — here and in the claim resolution — is a single
// `drawWeightedIndex` call over all six kinds in their fixed table order
// below, with weight 0 for any kind excluded or unavailable at that moment
// (steal.md §10): this keeps every kind draw at exactly one seed step and
// keeps the index-to-kind mapping independent of which kinds are excluded.

import type { Square } from "./board";
import { squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import type { GameState, NodeStatus, Ship } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import { PLANETS } from "./planets";
import type { PlayerMatchingSetting } from "./playerMatching";
import { gainPower } from "./power";
import { drawIndex, drawWeightedIndex } from "./random";
import type { ScoringSetting } from "./scoring";
import {
  addExtraProspectiveSquares,
  everyNodeHasExtra,
  scrambleProspectiveSquares,
} from "./steal";

/**
 * The six kinds an advanced planet bonus may be (steal.md §10), in the
 * table's fixed order — the order every weighted kind draw uses.
 */
export type AdvancedBonusKind =
  | "small-points"
  | "medium-points"
  | "large-points"
  | "fuel"
  | "additional-nodes"
  | "node-scramble";

/** The six kinds, in table order (steal.md §10). */
export const ADVANCED_BONUS_KINDS: readonly AdvancedBonusKind[] = [
  "small-points",
  "medium-points",
  "large-points",
  "fuel",
  "additional-nodes",
  "node-scramble",
];

/** Each kind's weight in the dealt-by-weight draw (steal.md §10). */
const ADVANCED_BONUS_WEIGHTS: Readonly<Record<AdvancedBonusKind, number>> = {
  "small-points": 30,
  "medium-points": 40,
  "large-points": 20,
  fuel: 16,
  "additional-nodes": 10,
  "node-scramble": 10,
};

/** One of the two bonuses standing on the board under advanced (steal.md §10). */
export interface AdvancedBonusEntry {
  readonly square: Square;
  readonly kind: AdvancedBonusKind;
}

/**
 * Whether `kind` may currently be dealt (steal.md §10): every kind but
 * Additional nodes is always available; Additional nodes is unavailable
 * exactly when every one of the game's `nodeCount` nodes already carries an
 * extra prospective square (`everyNodeHasExtra`).
 */
export function isAdvancedBonusKindAvailable(
  kind: AdvancedBonusKind,
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
): boolean {
  if (kind === "additional-nodes") {
    return !everyNodeHasExtra(nodes, nodeCount);
  }
  return true;
}

/**
 * Draws one of the six kinds by weight (steal.md §10): a single
 * `drawWeightedIndex` call over all six kinds in their fixed table order,
 * with weight 0 for any kind in `excludedKinds` or currently unavailable
 * (`isAdvancedBonusKindAvailable`). Exactly one seed step.
 */
export function drawAdvancedBonusKind(
  seed: number,
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  excludedKinds: ReadonlySet<AdvancedBonusKind> = new Set(),
): [kind: AdvancedBonusKind, nextSeed: number] {
  const weights = ADVANCED_BONUS_KINDS.map((kind) =>
    excludedKinds.has(kind) ||
    !isAdvancedBonusKindAvailable(kind, nodes, nodeCount)
      ? 0
      : ADVANCED_BONUS_WEIGHTS[kind],
  );
  const [index, nextSeed] = drawWeightedIndex(seed, weights);
  return [ADVANCED_BONUS_KINDS[index], nextSeed];
}

/**
 * Draws one planet uniformly at random from `eligiblePlanets`, every one
 * equally likely (steal.md §10). Exactly one seed step.
 */
export function drawAdvancedBonusPlanet(
  seed: number,
  eligiblePlanets: readonly Square[],
): [square: Square, nextSeed: number] {
  const [index, nextSeed] = drawIndex(seed, eligiblePlanets.length);
  return [eligiblePlanets[index], nextSeed];
}

/** One of the three sizes a points bonus's amount is looked up by (steal.md §10). */
export type AdvancedBonusPointSize = "small" | "medium" | "large";

/** `AdvancedBonusPointSize` for a points kind, or `undefined` for a non-points kind. */
export function advancedBonusPointSize(
  kind: AdvancedBonusKind,
): AdvancedBonusPointSize | undefined {
  switch (kind) {
    case "small-points":
      return "small";
    case "medium-points":
      return "medium";
    case "large-points":
      return "large";
    default:
      return undefined;
  }
}

type PointsBySize = Readonly<Record<AdvancedBonusPointSize, number>>;
type PointsByScoring = Readonly<Record<ScoringSetting, PointsBySize>>;
type PointsByMatching = Readonly<
  Record<PlayerMatchingSetting, PointsByScoring>
>;

/**
 * The point amounts a points bonus pays (steal.md §10), keyed by the game's
 * node count, its player-matching setting and its scoring, mirrored verbatim
 * from steal.md §10's table — `advancedBonus.test.ts` reads that table and
 * asserts the two agree, so a balancing change to one without the other
 * fails the suite.
 */
const ADVANCED_BONUS_POINTS: Readonly<
  Record<ChargedNodeCount, PointsByMatching>
> = {
  3: {
    off: {
      simple: { small: 2, medium: 3, large: 5 },
      bonus: { small: 3, medium: 5, large: 8 },
    },
    double: {
      simple: { small: 2, medium: 4, large: 6 },
      bonus: { small: 5, medium: 8, large: 12 },
    },
    required: {
      simple: { small: 1, medium: 2, large: 4 },
      bonus: { small: 2, medium: 4, large: 6 },
    },
  },
  4: {
    off: {
      simple: { small: 2, medium: 4, large: 6 },
      bonus: { small: 4, medium: 6, large: 10 },
    },
    double: {
      simple: { small: 3, medium: 5, large: 8 },
      bonus: { small: 6, medium: 10, large: 15 },
    },
    required: {
      simple: { small: 2, medium: 3, large: 5 },
      bonus: { small: 3, medium: 5, large: 8 },
    },
  },
  5: {
    off: {
      simple: { small: 3, medium: 5, large: 8 },
      bonus: { small: 5, medium: 8, large: 12 },
    },
    double: {
      simple: { small: 3, medium: 6, large: 10 },
      bonus: { small: 6, medium: 10, large: 15 },
    },
    required: {
      simple: { small: 2, medium: 4, large: 6 },
      bonus: { small: 4, medium: 6, large: 10 },
    },
  },
};

/**
 * The energy a points bonus of the given size pays, for a game of
 * `nodeCount` nodes under `playerMatching` and `scoring` (steal.md §10).
 */
export function advancedBonusPoints(
  nodeCount: ChargedNodeCount,
  playerMatching: PlayerMatchingSetting,
  scoring: ScoringSetting,
  size: AdvancedBonusPointSize,
): number {
  return ADVANCED_BONUS_POINTS[nodeCount][playerMatching][scoring][size];
}

/**
 * Draws the two planets, distinct and in draw order, plus each one's kind
 * (steal.md §10's opening deal): slot 0's planet uniformly over all twelve
 * planets, slot 1's uniformly over the eleven left, slot 0's kind by weight
 * with no exclusions, slot 1's by weight excluding slot 0's kind. Every
 * planet is empty at this point — no starting square is a planet — so no
 * planet needs excluding beyond slot 0's own. Exactly four seed steps.
 */
export function dealAdvancedBonuses(
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  seed: number,
): [
  bonuses: readonly [AdvancedBonusEntry, AdvancedBonusEntry],
  nextSeed: number,
] {
  const [firstPlanet, seedAfterFirstPlanet] = drawAdvancedBonusPlanet(
    seed,
    PLANETS,
  );
  const remainingPlanets = PLANETS.filter(
    (square) => squareName(square) !== squareName(firstPlanet),
  );
  const [secondPlanet, seedAfterSecondPlanet] = drawAdvancedBonusPlanet(
    seedAfterFirstPlanet,
    remainingPlanets,
  );
  const [firstKind, seedAfterFirstKind] = drawAdvancedBonusKind(
    seedAfterSecondPlanet,
    nodes,
    nodeCount,
  );
  const [secondKind, nextSeed] = drawAdvancedBonusKind(
    seedAfterFirstKind,
    nodes,
    nodeCount,
    new Set([firstKind]),
  );

  return [
    [
      { square: firstPlanet, kind: firstKind },
      { square: secondPlanet, kind: secondKind },
    ],
    nextSeed,
  ];
}

/**
 * What resolving a claim changed, beyond the state itself (steal.md §10): the
 * kind that was claimed; the energy it paid (0 for every kind but a points
 * one); which of the claiming side's ships gained a point of power from Fuel
 * (empty for every other kind); the squares Additional nodes added, and the
 * squares Node scramble removed and added (empty for every kind that is
 * neither); and the surviving bonus's square with its old and new kind,
 * alongside the new bonus's square and kind. Enough for `ply.ts` to build an
 * `AdvancedBonusClaimedEffect` and for the live region to describe the claim.
 */
export interface AdvancedBonusClaimOutcome {
  readonly kind: AdvancedBonusKind;
  readonly pointsAwarded: number;
  readonly poweredShipIds: readonly ShipId[];
  readonly addedSquares: readonly Square[];
  readonly removedSquares: readonly Square[];
  readonly survivor: {
    readonly square: Square;
    readonly oldKind: AdvancedBonusKind;
    readonly newKind: AdvancedBonusKind;
  };
  readonly newBonus: {
    readonly square: Square;
    readonly kind: AdvancedBonusKind;
  };
}

/** The state fields a claim's resolution changes, plus the outcome describing what happened. */
export interface ResolveAdvancedBonusClaimResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly ships: readonly Ship[];
  readonly advancedBonuses: readonly [AdvancedBonusEntry, AdvancedBonusEntry];
  readonly nextSeed: number;
  readonly outcome: AdvancedBonusClaimOutcome;
}

/**
 * Resolves `side` landing on `planet`, one of the two current advanced
 * bonuses' planets (steal.md §10): applies the claimed kind's own effect —
 * a points kind adds `advancedBonusPoints` to `side`'s energy (returned as
 * `pointsAwarded`, for `ply.ts` to apply — this function never reads or
 * writes an energy total itself); Fuel raises each of `side`'s ships below
 * the maximum by one power (`gainPower`), the claiming ship included, wherever
 * it stands; Additional nodes and Node scramble redraw the node map
 * (`addExtraProspectiveSquares`, `scrambleProspectiveSquares`), threading the
 * seed on. Then redraws the surviving bonus's kind, excluding the kind it
 * was; draws the new bonus's planet from the planets empty at that moment and
 * not the survivor's own; and draws the new bonus's kind, excluding the
 * survivor's new kind, in that fixed order, the effect's own draws first.
 * The new bonus takes the claimed bonus's slot; the survivor keeps its own.
 * Throws a `RangeError` if `planet` carries neither current bonus, or
 * if no planet is left for the new bonus to appear on — the five-ship limit
 * guarantees one, so the latter is a bug detector, not a case to handle.
 */
export function resolveAdvancedBonusClaim(
  state: Pick<
    GameState,
    | "nodes"
    | "ships"
    | "advancedBonuses"
    | "chargedNodeCount"
    | "playerMatching"
    | "scoring"
    | "randomSeed"
  >,
  side: Side,
  planet: Square,
): ResolveAdvancedBonusClaimResult {
  const claimedIndex = state.advancedBonuses.findIndex(
    (entry) => squareName(entry.square) === squareName(planet),
  );
  if (claimedIndex === -1) {
    throw new RangeError(
      `resolveAdvancedBonusClaim: ${squareName(planet)} carries no advanced bonus`,
    );
  }
  const claimed = state.advancedBonuses[claimedIndex];
  const survivor = state.advancedBonuses[claimedIndex === 0 ? 1 : 0];

  let nodes = state.nodes;
  let ships = state.ships;
  let seed = state.randomSeed;
  let pointsAwarded = 0;
  let poweredShipIds: readonly ShipId[] = [];
  let addedSquares: readonly Square[] = [];
  let removedSquares: readonly Square[] = [];

  const pointSize = advancedBonusPointSize(claimed.kind);
  if (pointSize !== undefined) {
    pointsAwarded = advancedBonusPoints(
      state.chargedNodeCount,
      state.playerMatching,
      state.scoring,
      pointSize,
    );
  } else if (claimed.kind === "fuel") {
    const powered: ShipId[] = [];
    ships = state.ships.map((ship) => {
      if (ship.side !== side) {
        return ship;
      }
      const gained = gainPower(ship.power, 1);
      if (gained.amount === 0) {
        return ship;
      }
      powered.push(ship.id);
      return { ...ship, power: gained.power };
    });
    poweredShipIds = powered;
  } else if (claimed.kind === "additional-nodes") {
    const shipSquares = ships.map((ship) => ship.square);
    const added = addExtraProspectiveSquares(
      nodes,
      state.chargedNodeCount,
      shipSquares,
      seed,
    );
    nodes = added.nodes;
    seed = added.nextSeed;
    addedSquares = added.addedSquares;
  } else if (claimed.kind === "node-scramble") {
    const shipSquares = ships.map((ship) => ship.square);
    const scrambled = scrambleProspectiveSquares(
      nodes,
      state.chargedNodeCount,
      shipSquares,
      seed,
    );
    nodes = scrambled.nodes;
    seed = scrambled.nextSeed;
    removedSquares = scrambled.removedSquares;
    addedSquares = scrambled.addedSquares;
  }

  const [survivorNewKind, seedAfterSurvivorKind] = drawAdvancedBonusKind(
    seed,
    nodes,
    state.chargedNodeCount,
    new Set([survivor.kind]),
  );

  const occupiedSquareNames = new Set(
    ships.map((ship) => squareName(ship.square)),
  );
  const eligiblePlanets = PLANETS.filter(
    (square) =>
      !occupiedSquareNames.has(squareName(square)) &&
      squareName(square) !== squareName(survivor.square),
  );
  if (eligiblePlanets.length === 0) {
    throw new RangeError(
      "resolveAdvancedBonusClaim: no empty planet is left for the new bonus — rules.md §7.1's five-ship limit guarantees one",
    );
  }
  const [newBonusSquare, seedAfterNewBonusPlanet] = drawAdvancedBonusPlanet(
    seedAfterSurvivorKind,
    eligiblePlanets,
  );
  const [newBonusKind, nextSeed] = drawAdvancedBonusKind(
    seedAfterNewBonusPlanet,
    nodes,
    state.chargedNodeCount,
    new Set([survivorNewKind]),
  );

  const survivorEntry: AdvancedBonusEntry = {
    square: survivor.square,
    kind: survivorNewKind,
  };
  const newEntry: AdvancedBonusEntry = {
    square: newBonusSquare,
    kind: newBonusKind,
  };
  const advancedBonuses: readonly [AdvancedBonusEntry, AdvancedBonusEntry] =
    claimedIndex === 0 ? [newEntry, survivorEntry] : [survivorEntry, newEntry];

  return {
    nodes,
    ships,
    advancedBonuses,
    nextSeed,
    outcome: {
      kind: claimed.kind,
      pointsAwarded,
      poweredShipIds,
      addedSquares,
      removedSquares,
      survivor: {
        square: survivor.square,
        oldKind: survivor.kind,
        newKind: survivorNewKind,
      },
      newBonus: { square: newBonusSquare, kind: newBonusKind },
    },
  };
}
