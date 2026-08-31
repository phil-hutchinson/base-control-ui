// The seventeen site squares (rules.md §3.2), the three states a site can be
// in (rules.md §8.1), and how a site's single `level` number moves within
// each state: a charged node's capacity and its two drawn drain
// distributions (§8.3), a dormant site's drawn recovery distribution (§8.2),
// and the pressure cap an active site's level is capped at (§8.2).

import { type Square, squareAt, squareName } from "./board";
import { drawIndex, drawWeightedIndex } from "./random";

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
 * The drain a dealt node opens at, drawn once for each of the five sites
 * the opening deal charges (rules.md §8.1). Weights are the whole-number
 * percentages the rules table shows, so the two can be read side by side.
 * Average 14. Never exceeds two-thirds of `NODE_CAPACITY`, so the deepest
 * dealt node still has 20 capacity left.
 */
export const OPENING_DRAIN_TABLE: readonly WeightedAmount[] = [
  { amount: 0, weight: 20 },
  { amount: 5, weight: 18 },
  { amount: 10, weight: 15 },
  { amount: 15, weight: 12 },
  { amount: 20, weight: 10 },
  { amount: 25, weight: 8 },
  { amount: 30, weight: 7 },
  { amount: 35, weight: 6 },
  { amount: 40, weight: 4 },
];

/**
 * The pressure a dealt site opens at, drawn once for each of the twelve
 * sites the opening deal leaves active (rules.md §8.1). Weights are the
 * whole-number percentages the rules table shows. Average 12.79.
 */
export const OPENING_PRESSURE_TABLE: readonly WeightedAmount[] = [
  { amount: 1, weight: 24 },
  { amount: 5, weight: 20 },
  { amount: 10, weight: 16 },
  { amount: 15, weight: 12 },
  { amount: 20, weight: 9 },
  { amount: 25, weight: 7 },
  { amount: 30, weight: 5 },
  { amount: 40, weight: 4 },
  { amount: 50, weight: 3 },
];

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

/**
 * Deals a whole opening board (rules.md §8.1): a seed in, the seventeen
 * site statuses keyed by `squareName`, and the next seed out. Replaces a
 * per-square answer, which cannot express a without-replacement draw or
 * carry a seed forward — see the design record for story 44.
 *
 * The draw order is fixed and must not change, because a recorded game
 * replays by replaying the seed:
 *
 * 1. Draw `TARGET_CHARGED_SITES` (5) sites, one at a time and uniformly,
 *    from a pool that starts as all of `SITES` in declared order. Each
 *    draw is `drawIndex(seed, pool.length)` — uniform, since at the deal
 *    no site has any pressure to weight by — removes the drawn site from
 *    the pool, and advances the seed. This is the shrinking-pool shape
 *    `runChargeDraw` uses for its (weighted) draw.
 * 2. Walk `SITES` in declared order. For each site, one `drawTableAmount`
 *    call: the opening drain table if the site was drawn charged in step
 *    1, the opening pressure table otherwise. The result becomes the
 *    site's `level`; its state is `charged` or `active` to match.
 *
 * That is 5 + 17 = 22 seed steps before green's first turn, where today
 * there are none. Nothing is dealt `dormant`.
 */
export function dealOpeningBoard(
  seed: number,
): [
  siteStates: Readonly<
    Record<string, { readonly state: SiteState; readonly level: number }>
  >,
  nextSeed: number,
] {
  let pool = [...SITES];
  let workingSeed = seed;
  const chargedNames = new Set<string>();

  for (let count = 0; count < TARGET_CHARGED_SITES; count++) {
    const [index, nextSeed] = drawIndex(workingSeed, pool.length);
    chargedNames.add(squareName(pool[index]));
    pool = pool.filter((_, poolIndex) => poolIndex !== index);
    workingSeed = nextSeed;
  }

  const siteStates: Record<string, { state: SiteState; level: number }> = {};

  for (const site of SITES) {
    const name = squareName(site);
    const charged = chargedNames.has(name);
    const [level, nextSeed] = drawTableAmount(
      workingSeed,
      charged ? OPENING_DRAIN_TABLE : OPENING_PRESSURE_TABLE,
    );
    siteStates[name] = { state: charged ? "charged" : "active", level };
    workingSeed = nextSeed;
  }

  return [siteStates, workingSeed];
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
