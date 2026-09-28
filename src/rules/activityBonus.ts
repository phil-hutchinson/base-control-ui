// The planet resources setting's own rules (steal.md §10): the six
// kinds and their weights, the point table, availability, the weighted kind
// draw, the uniform planet draw, the opening deal of the pair and the claim
// resolution. A leaf module over `gameState.ts`'s `NodeStatus` and `Ship`
// (types only — the same cycle `steal.ts` already carries with
// `gameState.ts`), `steal.ts`'s node-changing bonus effects, `fleet.ts`'s
// `Side` and `ShipId`, `nodes.ts`'s `ChargedNodeCount`, `planets.ts`'s
// `PLANETS`, `playerMatching.ts`'s `PlayerMatchingSetting`, `power.ts`'s
// `gainPower` and `MAX_POWER`, `scoring.ts`'s `ScoringSetting` and `random.ts`'s draws.
// `ply.ts` calls `resolveActivityBonusClaim` when a landing claims a bonus,
// and this module only ever changes the fields the claim touches — nodes,
// ships, the bonus pair and the seed — leaving everything else (whose ply it
// is, energy other than the claim's own payout, and so on) to `ply.ts`.
//
// The opening deal (steal.md §10) consumes exactly four seed steps, in this
// fixed order, after the steal opening deal has run and before play begins:
// slot 0's planet (uniform over all twelve planets), slot 1's planet
// (uniform over the eleven left), slot 0's kind (weighted, no exclusions),
// slot 1's kind (weighted, excluding slot 0's kind). `gameState.ts` calls
// `dealActivityBonuses` for this.
//
// A claim under race (steal.md §10) consumes, in this fixed order: (1) the
// claimed kind's own draws — none for a points kind or Fuel, one per square
// Additional nodes adds (`addExtraProspectiveSquares`), two per prospective
// square a Node scramble shuffles (`shuffleProspectiveSignals`); (2) one step for the surviving bonus's new
// kind, excluding the kind it was; (3) one step for the new bonus's planet,
// drawn from planets empty at that moment and not the survivor's; (4) one
// step for the new bonus's kind, excluding the survivor's new kind. A claim
// under stable consumes the same steps without (2): the survivor keeps its
// kind, so nothing is drawn for it, and the new bonus's kind excludes the
// survivor's kept kind. `resolveActivityBonusClaim` runs them.
//
// Every kind draw — here and in the claim resolution — is a single
// `drawWeightedIndex` call over all six kinds in their fixed table order
// below, with weight 0 for any kind excluded or unavailable at that moment
// (steal.md §10): this keeps every kind draw at exactly one seed step and
// keeps the index-to-kind mapping independent of which kinds are excluded.
// Fuel's weight is measured from the ships passed to each draw
// (`fuelWeight`): the opening deal passes the starting fleet, and a claim
// passes every ship as it stands after the claimed kind's own effect.

import type { Square } from "./board";
import { squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import type { GameState, NodeStatus, Ship } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import { PLANETS } from "./planets";
import type { PlayerMatchingSetting } from "./playerMatching";
import { gainPower, MAX_POWER } from "./power";
import { drawIndex, drawWeightedIndex } from "./random";
import type { ScoringSetting } from "./scoring";
import {
  addExtraProspectiveSquares,
  everyNodeHasExtra,
  shuffleProspectiveSignals,
} from "./steal";

/**
 * The six kinds an activity bonus may be (steal.md §10), in the
 * table's fixed order — the order every weighted kind draw uses.
 */
export type ActivityBonusKind =
  | "small-points"
  | "medium-points"
  | "large-points"
  | "fuel"
  | "additional-nodes"
  | "node-scramble";

/** The six kinds, in table order (steal.md §10). */
export const ACTIVITY_BONUS_KINDS: readonly ActivityBonusKind[] = [
  "small-points",
  "medium-points",
  "large-points",
  "fuel",
  "additional-nodes",
  "node-scramble",
];

/**
 * Each fixed-weight kind's weight in the dealt-by-weight draw (steal.md
 * §10). Fuel's weight is not fixed: `fuelWeight` computes it.
 */
const ACTIVITY_BONUS_WEIGHTS: Readonly<
  Record<Exclude<ActivityBonusKind, "fuel">, number>
> = {
  "small-points": 30,
  "medium-points": 40,
  "large-points": 20,
  "additional-nodes": 15,
  "node-scramble": 15,
};

/** Fuel's weight when no ship is missing any power (steal.md §10). */
const FUEL_BASE_WEIGHT = 10;

/** The most missing power that adds to Fuel's weight (steal.md §10). */
const FUEL_MISSING_POWER_CAP = 30;

/**
 * Fuel's weight in a kind draw (steal.md §10): `FUEL_BASE_WEIGHT`, plus one
 * for every point of power missing across every ship given — a ship's
 * missing power being `MAX_POWER` less its power — the addition capped at
 * `FUEL_MISSING_POWER_CAP`, so 10 to 40. Callers pass every ship on the
 * board, of both sides, as it stands at the moment of the draw.
 */
export function fuelWeight(ships: readonly Pick<Ship, "power">[]): number {
  const missing = ships.reduce(
    (total, ship) => total + (MAX_POWER - ship.power),
    0,
  );
  return FUEL_BASE_WEIGHT + Math.min(FUEL_MISSING_POWER_CAP, missing);
}

/** One of the two activity bonuses standing on the board (steal.md §10). */
export interface ActivityBonusEntry {
  readonly square: Square;
  readonly kind: ActivityBonusKind;
}

/**
 * Whether `kind` may currently be dealt (steal.md §10): every kind but
 * Additional nodes is always available; Additional nodes is unavailable
 * exactly when every one of the game's `nodeCount` nodes already carries an
 * extra prospective square (`everyNodeHasExtra`).
 */
export function isActivityBonusKindAvailable(
  kind: ActivityBonusKind,
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
 * (`isActivityBonusKindAvailable`). Fuel's weight is measured from `ships`
 * (`fuelWeight`), which should be every ship on the board as it stands at
 * the moment of the draw. Exactly one seed step.
 */
export function drawActivityBonusKind(
  seed: number,
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  ships: readonly Pick<Ship, "power">[],
  excludedKinds: ReadonlySet<ActivityBonusKind> = new Set(),
): [kind: ActivityBonusKind, nextSeed: number] {
  const weights = ACTIVITY_BONUS_KINDS.map((kind) =>
    excludedKinds.has(kind) ||
    !isActivityBonusKindAvailable(kind, nodes, nodeCount)
      ? 0
      : kind === "fuel"
        ? fuelWeight(ships)
        : ACTIVITY_BONUS_WEIGHTS[kind],
  );
  const [index, nextSeed] = drawWeightedIndex(seed, weights);
  return [ACTIVITY_BONUS_KINDS[index], nextSeed];
}

/**
 * Draws one planet uniformly at random from `eligiblePlanets`, every one
 * equally likely (steal.md §10). Exactly one seed step.
 */
export function drawActivityBonusPlanet(
  seed: number,
  eligiblePlanets: readonly Square[],
): [square: Square, nextSeed: number] {
  const [index, nextSeed] = drawIndex(seed, eligiblePlanets.length);
  return [eligiblePlanets[index], nextSeed];
}

/** One of the three sizes a points bonus's amount is looked up by (steal.md §10). */
export type ActivityBonusPointSize = "small" | "medium" | "large";

/** `ActivityBonusPointSize` for a points kind, or `undefined` for a non-points kind. */
export function activityBonusPointSize(
  kind: ActivityBonusKind,
): ActivityBonusPointSize | undefined {
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

type PointsBySize = Readonly<Record<ActivityBonusPointSize, number>>;
type PointsByScoring = Readonly<Record<ScoringSetting, PointsBySize>>;
type PointsByMatching = Readonly<
  Record<PlayerMatchingSetting, PointsByScoring>
>;

/**
 * The point amounts a points bonus pays (steal.md §10), keyed by the game's
 * node count, its player-matching setting and its scoring, mirrored verbatim
 * from steal.md §10's table — `activityBonus.test.ts` reads that table and
 * asserts the two agree, so a balancing change to one without the other
 * fails the suite.
 */
const ACTIVITY_BONUS_POINTS: Readonly<
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
export function activityBonusPoints(
  nodeCount: ChargedNodeCount,
  playerMatching: PlayerMatchingSetting,
  scoring: ScoringSetting,
  size: ActivityBonusPointSize,
): number {
  return ACTIVITY_BONUS_POINTS[nodeCount][playerMatching][scoring][size];
}

/**
 * Draws the two planets, distinct and in draw order, plus each one's kind
 * (steal.md §10's opening deal): slot 0's planet uniformly over all twelve
 * planets, slot 1's uniformly over the eleven left, slot 0's kind by weight
 * with no exclusions, slot 1's by weight excluding slot 0's kind. Every
 * planet is empty at this point — no starting square is a planet — so no
 * planet needs excluding beyond slot 0's own. Both kind draws measure
 * Fuel's weight from `ships`, the starting fleet. Exactly four seed steps.
 */
export function dealActivityBonuses(
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  ships: readonly Pick<Ship, "power">[],
  seed: number,
): [
  bonuses: readonly [ActivityBonusEntry, ActivityBonusEntry],
  nextSeed: number,
] {
  const [firstPlanet, seedAfterFirstPlanet] = drawActivityBonusPlanet(
    seed,
    PLANETS,
  );
  const remainingPlanets = PLANETS.filter(
    (square) => squareName(square) !== squareName(firstPlanet),
  );
  const [secondPlanet, seedAfterSecondPlanet] = drawActivityBonusPlanet(
    seedAfterFirstPlanet,
    remainingPlanets,
  );
  const [firstKind, seedAfterFirstKind] = drawActivityBonusKind(
    seedAfterSecondPlanet,
    nodes,
    nodeCount,
    ships,
  );
  const [secondKind, nextSeed] = drawActivityBonusKind(
    seedAfterFirstKind,
    nodes,
    nodeCount,
    ships,
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
 * (empty for every other kind); the squares Additional nodes added (empty
 * for every other kind — a Node scramble adds no square, it only shuffles
 * signals); and the surviving bonus's square with its old and new kind,
 * alongside the new bonus's square and kind. Enough for `ply.ts` to build an
 * `ActivityBonusClaimedEffect` and for the live region to describe the claim.
 */
export interface ActivityBonusClaimOutcome {
  readonly kind: ActivityBonusKind;
  readonly pointsAwarded: number;
  readonly poweredShipIds: readonly ShipId[];
  readonly addedSquares: readonly Square[];
  readonly survivor: {
    readonly square: Square;
    readonly oldKind: ActivityBonusKind;
    readonly newKind: ActivityBonusKind;
  };
  readonly newBonus: {
    readonly square: Square;
    readonly kind: ActivityBonusKind;
  };
}

/** The state fields a claim's resolution changes, plus the outcome describing what happened. */
export interface ResolveActivityBonusClaimResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly ships: readonly Ship[];
  readonly activityBonuses: readonly [ActivityBonusEntry, ActivityBonusEntry];
  readonly nextSeed: number;
  readonly outcome: ActivityBonusClaimOutcome;
}

/**
 * Resolves `side` landing on `planet`, one of the two current activity
 * bonuses' planets (steal.md §10): applies the claimed kind's own effect — a
 * points kind adds `activityBonusPoints` to `side`'s energy (returned as
 * `pointsAwarded`, for `ply.ts` to apply — this function never reads or
 * writes an energy total itself); Fuel raises each of `side`'s ships below
 * the maximum by one power (`gainPower`), the claiming ship included, wherever
 * it stands; Additional nodes adds prospective squares
 * (`addExtraProspectiveSquares`) and Node scramble shuffles the prospective
 * squares' signals (`shuffleProspectiveSignals`), threading the seed on. Then, under race only, redraws the surviving bonus's kind,
 * excluding the kind it was — under stable the survivor keeps its kind and
 * nothing is drawn for it, so `survivor.newKind` equals `survivor.oldKind`;
 * draws the new bonus's planet from the planets empty at that moment and
 * not the survivor's own; and draws the new bonus's kind, excluding the
 * survivor's kind after the claim, in that fixed order, the effect's own
 * draws first. Both kind draws measure Fuel's weight from every ship as it
 * stands after the claimed kind's own effect — a Fuel just paid included.
 * The new bonus takes the claimed bonus's slot; the survivor
 * keeps its own. Throws a `RangeError` if the planet resources setting is
 * off, if `planet` carries neither current bonus, or if no planet is left
 * for the new bonus to appear on — the five-ship limit guarantees one, so
 * the last is a bug detector, not a case to handle.
 */
export function resolveActivityBonusClaim(
  state: Pick<
    GameState,
    | "nodes"
    | "ships"
    | "activityBonuses"
    | "chargedNodeCount"
    | "playerMatching"
    | "planetActivity"
    | "scoring"
    | "randomSeed"
  >,
  side: Side,
  planet: Square,
): ResolveActivityBonusClaimResult {
  if (state.planetActivity === "off") {
    throw new RangeError(
      "resolveActivityBonusClaim: the planet resources setting is off, so no activity bonus can be claimed",
    );
  }
  const claimedIndex = state.activityBonuses.findIndex(
    (entry) => squareName(entry.square) === squareName(planet),
  );
  if (claimedIndex === -1) {
    throw new RangeError(
      `resolveActivityBonusClaim: ${squareName(planet)} carries no activity bonus`,
    );
  }
  const claimed = state.activityBonuses[claimedIndex];
  const survivor = state.activityBonuses[claimedIndex === 0 ? 1 : 0];

  let nodes = state.nodes;
  let ships = state.ships;
  let seed = state.randomSeed;
  let pointsAwarded = 0;
  let poweredShipIds: readonly ShipId[] = [];
  let addedSquares: readonly Square[] = [];

  const pointSize = activityBonusPointSize(claimed.kind);
  if (pointSize !== undefined) {
    pointsAwarded = activityBonusPoints(
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
    const shuffled = shuffleProspectiveSignals(
      nodes,
      state.chargedNodeCount,
      state.playerMatching,
      seed,
    );
    nodes = shuffled.nodes;
    seed = shuffled.nextSeed;
  }

  const [survivorNewKind, seedAfterSurvivorKind]: [ActivityBonusKind, number] =
    state.planetActivity === "race"
      ? drawActivityBonusKind(
          seed,
          nodes,
          state.chargedNodeCount,
          ships,
          new Set([survivor.kind]),
        )
      : [survivor.kind, seed];

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
      "resolveActivityBonusClaim: no empty planet is left for the new bonus — rules.md §7.1's five-ship limit guarantees one",
    );
  }
  const [newBonusSquare, seedAfterNewBonusPlanet] = drawActivityBonusPlanet(
    seedAfterSurvivorKind,
    eligiblePlanets,
  );
  const [newBonusKind, nextSeed] = drawActivityBonusKind(
    seedAfterNewBonusPlanet,
    nodes,
    state.chargedNodeCount,
    ships,
    new Set([survivorNewKind]),
  );

  const survivorEntry: ActivityBonusEntry = {
    square: survivor.square,
    kind: survivorNewKind,
  };
  const newEntry: ActivityBonusEntry = {
    square: newBonusSquare,
    kind: newBonusKind,
  };
  const activityBonuses: readonly [ActivityBonusEntry, ActivityBonusEntry] =
    claimedIndex === 0 ? [newEntry, survivorEntry] : [survivorEntry, newEntry];

  return {
    nodes,
    ships,
    activityBonuses,
    nextSeed,
    outcome: {
      kind: claimed.kind,
      pointsAwarded,
      poweredShipIds,
      addedSquares,
      survivor: {
        square: survivor.square,
        oldKind: survivor.kind,
        newKind: survivorNewKind,
      },
      newBonus: { square: newBonusSquare, kind: newBonusKind },
    },
  };
}
