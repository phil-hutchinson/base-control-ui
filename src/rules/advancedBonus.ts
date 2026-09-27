// The advanced planet bonus setting's own rules (steal.md §10): the six
// kinds and their weights, the point table, availability, the weighted kind
// draw, the uniform planet draw, and the opening deal of the pair. A leaf
// module over `gameState.ts`'s `NodeStatus` (type only — the same cycle
// `steal.ts` already carries with `gameState.ts`), `steal.ts`'s
// `everyNodeHasExtra`, `nodes.ts`'s `ChargedNodeCount`, `planets.ts`'s
// `PLANETS`, `playerMatching.ts`'s `PlayerMatchingSetting`, `scoring.ts`'s
// `ScoringSetting` and `random.ts`'s draws. Claiming a bonus in play — the
// three-part claim order of steal.md §10 — is `ply.ts`'s to call into, once
// Step 5 adds it; this module only resolves the opening deal, since that is
// the one draw that happens before any `GameState` exists.
//
// The opening deal (steal.md §10) consumes exactly four seed steps, in this
// fixed order, after the steal opening deal has run and before play begins:
// slot 0's planet (uniform over all twelve planets), slot 1's planet
// (uniform over the eleven left), slot 0's kind (weighted, no exclusions),
// slot 1's kind (weighted, excluding slot 0's kind). `gameState.ts` calls
// `dealAdvancedBonuses` for this.
//
// Every kind draw — here and in the claim resolution Step 5 adds — is a
// single `drawWeightedIndex` call over all six kinds in their fixed table
// order below, with weight 0 for any kind excluded or unavailable at that
// moment (steal.md §10): this keeps every kind draw at exactly one seed step
// and keeps the index-to-kind mapping independent of which kinds are
// excluded.

import type { Square } from "./board";
import { squareName } from "./board";
import type { NodeStatus } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import { PLANETS } from "./planets";
import type { PlayerMatchingSetting } from "./playerMatching";
import { drawIndex, drawWeightedIndex } from "./random";
import type { ScoringSetting } from "./scoring";
import { everyNodeHasExtra } from "./steal";

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
 * Draws one of the six kinds by weight (steal.md §10, D6 of the
 * implementation plan): a single `drawWeightedIndex` call over all six kinds
 * in their fixed table order, with weight 0 for any kind in `excludedKinds`
 * or currently unavailable (`isAdvancedBonusKindAvailable`). Exactly one
 * seed step.
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
      bonus: { small: 4, medium: 6, large: 10 },
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
      bonus: { small: 5, medium: 8, large: 12 },
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
