// The seventeen site squares (rules.md §3.2), the three states a site can be
// in (rules.md §8.1), and how a site's single `level` number moves within
// each state: a charged node's capacity and its two drawn drain
// distributions (§8.3), a dormant site's drawn recovery distribution (§8.2),
// and the pressure cap an active site's level is capped at (§8.2).

import { type Square, squareAt, squareName } from "./board";
import { drawWeightedIndex } from "./random";

/**
 * The seventeen site squares, in the row order rules.md §3.2 lists them
 * (bottom to top, left to right within a row).
 */
export const SITES: readonly Square[] = [
  // Row 2
  squareAt("F", 2),
  squareAt("J", 2),
  // Row 4
  squareAt("B", 4),
  squareAt("H", 4),
  squareAt("N", 4),
  // Row 5
  squareAt("E", 5),
  squareAt("K", 5),
  // Row 8
  squareAt("D", 8),
  squareAt("H", 8),
  squareAt("L", 8),
  // Row 11
  squareAt("E", 11),
  squareAt("K", 11),
  // Row 12
  squareAt("B", 12),
  squareAt("H", 12),
  squareAt("N", 12),
  // Row 14
  squareAt("F", 14),
  squareAt("J", 14),
];

/** The three states a site can be in (rules.md §8.1). */
export type SiteState = "active" | "charged" | "dormant";

/**
 * How much drain a charged node can take before it is spent (rules.md
 * §8.3). A first guess to be play-tested and retuned, not a claim that 60 is
 * right.
 */
export const NODE_CAPACITY = 60;

/**
 * The most pressure an active site can build (rules.md §8.2). A first guess
 * to be play-tested and retuned, not a claim that 50 is right.
 */
export const PRESSURE_CAP = 50;

/**
 * The pressure an active site starts at, whether from the opening position
 * or from finishing recovery (rules.md §8.2, §8.6 step 6).
 */
export const STARTING_PRESSURE = 1;

/**
 * How many sites the board aims to keep charged at all times (rules.md
 * §8.1, §8.2). This is an aim, not an invariant: the board charges up to
 * this many active sites at the end of every turn, and falls short when
 * there are not enough active sites to reach it.
 */
export const TARGET_CHARGED_SITES = 5;

/** One outcome of a weighted draw: an amount, and its share of the total weight. */
export interface WeightedAmount {
  readonly amount: number;
  readonly weight: number;
}

/**
 * How much an empty charged node's drain rises by at the end of a turn no
 * ship stood on it (rules.md §8.3). Weights are the whole-number
 * percentages the rules table shows, so the two can be read side by side.
 * Average 2.1.
 */
export const EMPTY_NODE_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 1, weight: 20 },
  { amount: 2, weight: 50 },
  { amount: 3, weight: 30 },
];

/**
 * How much a held charged node's drain rises by at the end of a turn a ship
 * of either side stood on it (rules.md §8.3). Weights are the whole-number
 * percentages the rules table shows. Average 4.6.
 */
export const HELD_NODE_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 3, weight: 10 },
  { amount: 4, weight: 40 },
  { amount: 5, weight: 30 },
  { amount: 6, weight: 20 },
];

/**
 * How much a dormant site's level falls by at the end of a turn (rules.md
 * §8.2). Weights are the whole-number percentages the rules table shows.
 * Average 6.
 */
export const DORMANT_RECOVERY_TABLE: readonly WeightedAmount[] = [
  { amount: 4, weight: 10 },
  { amount: 5, weight: 25 },
  { amount: 6, weight: 30 },
  { amount: 7, weight: 25 },
  { amount: 8, weight: 10 },
];

/**
 * Draws one amount from a `WeightedAmount` table, returning the amount and
 * the next seed. Built on `drawWeightedIndex`, so it advances the seed
 * exactly once and shares that function's refusals.
 */
export function drawTableAmount(
  seed: number,
  table: readonly WeightedAmount[],
): [amount: number, nextSeed: number] {
  const [index, nextSeed] = drawWeightedIndex(
    seed,
    table.map((entry) => entry.weight),
  );
  return [table[index].amount, nextSeed];
}

/** The five sites that start the game charged (rules.md §8.1). */
const OPENING_CHARGED_SQUARES: readonly Square[] = [
  squareAt("H", 8),
  squareAt("E", 5),
  squareAt("K", 5),
  squareAt("E", 11),
  squareAt("K", 11),
];

const OPENING_CHARGED_SQUARE_NAMES: ReadonlySet<string> = new Set(
  OPENING_CHARGED_SQUARES.map(squareName),
);

const SITE_NAMES: ReadonlySet<string> = new Set(SITES.map(squareName));

/**
 * The state and `level` a site starts the game in, or `undefined` if the
 * given square is not a site at all (rules.md §8.1). The five opening
 * sites — H8, E5, K5, E11, K11 — are `charged` at drain 0; every other site
 * is `active` at pressure 1. Nothing starts dormant.
 */
export function startingSiteStatus(
  square: Square,
): { readonly state: SiteState; readonly level: number } | undefined {
  const name = squareName(square);
  if (!SITE_NAMES.has(name)) {
    return undefined;
  }
  if (OPENING_CHARGED_SQUARE_NAMES.has(name)) {
    return { state: "charged", level: 0 };
  }
  return { state: "active", level: STARTING_PRESSURE };
}

/**
 * How far a site's `level` has travelled through its state's own artwork
 * cycle, clamped to [0, 1]: a charged node's drain against `NODE_CAPACITY`,
 * a dormant site's remaining drain against `NODE_CAPACITY` (so a node ended
 * early begins its dormancy already part travelled), and an active site's
 * pressure against `PRESSURE_CAP`, from 1 up. Every state reports a
 * position; none is undefined.
 */
export function siteCyclePosition(state: SiteState, level: number): number {
  const denominator = state === "active" ? PRESSURE_CAP - 1 : NODE_CAPACITY;

  if (denominator <= 0) {
    return 0;
  }

  let raw: number;

  if (state === "charged") {
    raw = level / denominator;
  } else if (state === "dormant") {
    raw = 1 - level / denominator;
  } else {
    raw = (level - 1) / denominator;
  }

  return Math.min(1, Math.max(0, raw));
}
