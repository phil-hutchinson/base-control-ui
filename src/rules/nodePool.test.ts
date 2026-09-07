// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). It drives `runEndOfTurn` from
// real starting positions across a handful of seeds and several hundred
// plies each, and checks the claims Appendix B makes about the finished
// game: the queue's invariants hold at every ply, every node the run ever
// places is legal at the moment it appears, the weighting measurably
// spreads a freshly dealt trio, and the cadence and node-count figures the
// appendix quotes are in the right neighbourhood.
//
// One finding is worth recording here for Appendix B's benefit, since nothing
// else in the codebase measures it: across every seed this file runs, and
// every refill, direct-fourth placement and opening deal within them,
// section 3.2's fallback never had to fire once. "Legal at the moment it
// appears" below is checked by independently recomputing each ordinary
// constraint against the board as the code built it, not by trusting
// whichever pool `legalNodePool` actually returned — a square that failed
// any of those constraints could only ever have come from the fallback, so
// every placement clearing them is itself the fallback-never-fired evidence.

import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareName,
} from "./board";
import type { NodeAppearedChargedEffect } from "./charging";
import { type QueueRefilledEffect, runEndOfTurn } from "./endOfTurn";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
  startingGameState,
} from "./gameState";
import {
  type NodePoolWidth,
  drawUniformSquare,
  legalNodePool,
} from "./nodePlacement";
import {
  INACTIVE_NODE_COUNT,
  type InactiveNodeDraw,
  TOP_NODE_PRIORITY,
  inactivePriority,
} from "./nodeQueue";
import { TARGET_CHARGED_NODES } from "./nodes";
import { PLANETS, isPlanet } from "./planets";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821, 20260822, 20260823];

/**
 * The lowest a freshly refilled trio's mean smallest pairwise Chebyshev gap
 * is allowed to fall to, pooled across `SEEDS`. Measured at 4.78 over an
 * actually-played economy — lower than `nodeQueue.test.ts`'s idealised
 * empty-board figure of roughly 5.1, because a played board's charged
 * nodes, ships and surviving depleted nodes crowd the pool the weighting
 * draws from. This bound leaves comfortable margin below that.
 */
const MINIMUM_MEAN_REFILL_GAP = 4;

/**
 * How much further, on average, the weighted mean gap above must clear the
 * mean gap an unweighted draw from the very same pools produces (computed
 * in this file, from the very same occupied squares, so the comparison is
 * self-contained). Measured at a difference of roughly 1.0 (4.78 weighted
 * against 3.78 unweighted); this bound leaves margin.
 */
const MINIMUM_SPREAD_ADVANTAGE = 0.5;

/**
 * The band the mean number of turns between one refill and the next is
 * allowed to sit in, pooled across `SEEDS`. Measured at roughly 7.9 turns —
 * a charged node's own life averages closer to twenty-nine turns than
 * twenty, mostly because a refilled node always starts at zero drain. The
 * bounds below leave generous margin either side of the measured figure.
 */
const MINIMUM_MEAN_PLIES_BETWEEN_REFILLS = 5;
const MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS = 12;

/**
 * The band the board's total node count — four charged, three inactive,
 * plus however many are depleted — is allowed to breathe within. Measured
 * range across `SEEDS` and `PLIES_TO_RUN`: 7 to 11, with a mean around 8.4.
 * This bound leaves a little margin either side of the measured range.
 */
const MINIMUM_TOTAL_NODES = 6;
const MAXIMUM_TOTAL_NODES = 12;

/**
 * How often two or more nodes are allowed to run out on the same turn, as a
 * share of turns played. Measured over `SEEDS` this sits at or under 1.4%;
 * the bound below leaves generous margin above that. Unaffected by the
 * queue — the drain and depletion clocks this measures are untouched by
 * this story.
 */
const MAXIMUM_MULTI_EXPIRY_SHARE = 0.1;

/**
 * No turn was observed to run out all four charged nodes at once across
 * this file's runs, so `MAXIMUM_EXPIRIES_IN_ONE_PLY` below is set one short
 * of `TARGET_CHARGED_NODES`. That is a description of what was measured,
 * not a rule the game enforces: it can happen (rules.md §8.2), and when it
 * does the direct-fourth placement covers it, exercised deliberately in
 * `charging.test.ts` and `endOfTurn.test.ts` rather than waited for here.
 */
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_NODES - 1;

/** One ply's sample of the board, taken from `result.state` after `runEndOfTurn`. */
interface EconomySample {
  readonly chargedCount: number;
  readonly depletedCount: number;
  readonly totalNodeCount: number;
  readonly nodesRanOutThisPly: number;
  /** Every inactive node's square name and priority, for the invariant and rotation checks. */
  readonly inactiveByName: ReadonlyMap<string, number>;
}

/** One refill this run observed, with enough reconstructed context to check every draw's legality. */
interface RefillRecord {
  readonly newNodes: readonly InactiveNodeDraw[];
  /**
   * Every square that held a node immediately before this refill's three
   * draws — the discarded survivors already removed, the direct-fourth
   * placement (if any, this same ply) already added — reconstructed from
   * the ply's `before` state and its effects rather than read off any
   * private state `runEndOfTurn` does not expose.
   */
  readonly occupiedBeforeRefill: readonly Square[];
}

/** One direct-fourth placement this run observed, with the board it appeared against. */
interface DirectFourthRecord {
  readonly square: Square;
  readonly occupiedBefore: readonly Square[];
}

interface EconomyRun {
  readonly samples: readonly EconomySample[];
  readonly refills: readonly RefillRecord[];
  readonly directFourths: readonly DirectFourthRecord[];
  readonly shipSquares: readonly Square[];
}

/**
 * Drives the end-of-turn sequence for `plies` turns from the opening
 * position, with no ship ever moving, and samples the board after each
 * turn. Also reconstructs, from each ply's `before` state and its effects,
 * exactly what `legalNodePool` saw at the moment of every refill draw and
 * every direct-fourth placement — without reaching into `runEndOfTurn`'s
 * private working state — so the legality and spread checks below can be
 * run against the real thing rather than a hand-built stand-in.
 */
function runEconomy(seed: number, plies: number): EconomyRun {
  let state: GameState = startingGameState(seed, NOMINAL_LENGTH_IN_ROUNDS);
  const shipSquares = state.ships.map((ship) => ship.square);
  const samples: EconomySample[] = [];
  const refills: RefillRecord[] = [];
  const directFourths: DirectFourthRecord[] = [];

  for (let i = 0; i < plies; i++) {
    const beforeState = state;
    const result = runEndOfTurn(state);

    const appeared = result.effects.find(
      (effect): effect is NodeAppearedChargedEffect =>
        effect.type === "node-appeared-charged",
    );
    if (appeared !== undefined) {
      directFourths.push({
        square: appeared.square,
        // Step 4/5's charging never removes a square before this one is
        // drawn (a queue charge only relabels a square, and this square is
        // brand new), so every node present at the start of the ply is
        // still occupying its square at the moment this one is drawn.
        occupiedBefore: nodeSquares(beforeState),
      });
    }

    const refilled = result.effects.find(
      (effect): effect is QueueRefilledEffect =>
        effect.type === "queue-refilled",
    );
    if (refilled !== undefined) {
      const discardedNames = new Set(refilled.discardedSquares.map(squareName));
      const occupiedBeforeRefill = nodeSquares(beforeState)
        .filter((square) => !discardedNames.has(squareName(square)))
        .concat(appeared !== undefined ? [appeared.square] : []);
      refills.push({ newNodes: refilled.newNodes, occupiedBeforeRefill });
    }

    const chargedSquares = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "charged",
    );
    const depletedSquares = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "depleted",
    );
    const inactiveSquares = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "inactive",
    );
    const inactiveByName = new Map(
      inactiveSquares.map((square) => [
        squareName(square),
        inactivePriority(nodeStatusAt(result.state, square)!),
      ]),
    );

    samples.push({
      chargedCount: chargedSquares.length,
      depletedCount: depletedSquares.length,
      totalNodeCount: nodeSquares(result.state).length,
      nodesRanOutThisPly: result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      ).length,
      inactiveByName,
    });

    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return { samples, refills, directFourths, shipSquares };
}

function ringsFromEdge(square: Square): number {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const columnDistance = Math.min(
    columnIndex,
    COLUMN_LETTERS.length - 1 - columnIndex,
  );
  const rowDistance = Math.min(square.row - 1, BOARD_SIZE - square.row);
  return Math.min(columnDistance, rowDistance);
}

function isAdjacent(a: Square, b: Square): boolean {
  return chebyshevDistance(a, b) <= 1;
}

/**
 * Independently checks `square` against every one of section 3.2's six
 * ordinary constraints for the given occupied node squares, ship squares
 * and pool width — reimplemented here rather than delegating to
 * `legalNodePool`, because a square drawn from `legalNodePool`'s fallback
 * would trivially pass a membership check against whatever pool it was
 * drawn from. A square that clears every constraint here could not have
 * come from the fallback: the fallback only ever fires when no square
 * anywhere clears them all, which this square, by clearing them, disproves.
 */
function satisfiesOrdinaryPoolConstraints(
  square: Square,
  occupiedSquares: readonly Square[],
  shipSquares: readonly Square[],
  poolWidth: NodePoolWidth,
): boolean {
  const requiredRings = poolWidth === "widened" ? 1 : 2;
  const name = squareName(square);

  if (occupiedSquares.some((occupied) => squareName(occupied) === name)) {
    return false;
  }
  if (shipSquares.some((ship) => squareName(ship) === name)) {
    return false;
  }
  if (ringsFromEdge(square) < requiredRings) {
    return false;
  }
  if (occupiedSquares.some((occupied) => isAdjacent(square, occupied))) {
    return false;
  }
  if (isPlanet(square)) {
    return false;
  }
  if (PLANETS.some((planet) => isAdjacent(square, planet))) {
    return false;
  }
  return true;
}

function smallestPairwiseGap(squares: readonly Square[]): number {
  let minimum = Infinity;
  for (let a = 0; a < squares.length; a++) {
    for (let b = a + 1; b < squares.length; b++) {
      minimum = Math.min(minimum, chebyshevDistance(squares[a], squares[b]));
    }
  }
  return minimum;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

describe("the queue's invariants hold at every turn (Appendix B)", () => {
  it.each(SEEDS)(
    "holds exactly three inactive nodes at every turn, holding priorities {1, 2, 3} (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);

      run.samples.forEach((sample, i) => {
        const priorities = [...sample.inactiveByName.values()];
        expect(priorities, `ply ${i}`).toHaveLength(INACTIVE_NODE_COUNT);
        expect([...priorities].sort(), `ply ${i}`).toEqual([1, 2, 3]);
      });
    },
  );

  it.each(SEEDS)(
    "holds exactly four charged nodes after every turn (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);

      run.samples.forEach((sample, i) => {
        expect(sample.chargedCount, `ply ${i}`).toBe(TARGET_CHARGED_NODES);
      });
    },
  );

  it.each(SEEDS)(
    "keeps the board's total node count within a sane, measured band (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);

      run.samples.forEach((sample, i) => {
        expect(sample.totalNodeCount, `ply ${i}`).toBeGreaterThanOrEqual(
          MINIMUM_TOTAL_NODES,
        );
        expect(sample.totalNodeCount, `ply ${i}`).toBeLessThanOrEqual(
          MAXIMUM_TOTAL_NODES,
        );
      });
    },
  );

  it.each(SEEDS)(
    "keeps expiries spread rather than arriving together (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);

      const multiExpiryPlies = run.samples.filter(
        (sample) => sample.nodesRanOutThisPly >= 2,
      ).length;
      expect(multiExpiryPlies / run.samples.length).toBeLessThan(
        MAXIMUM_MULTI_EXPIRY_SHARE,
      );

      for (const sample of run.samples) {
        expect(sample.nodesRanOutThisPly).toBeLessThanOrEqual(
          MAXIMUM_EXPIRIES_IN_ONE_PLY,
        );
      }
    },
  );
});

describe("every new node is legal the moment it appears, and the fallback never fires (Appendix B)", () => {
  it.each(SEEDS)(
    "deals an opening board whose seven nodes are all individually legal (seed %d)",
    (seed) => {
      const state = startingGameState(seed, NOMINAL_LENGTH_IN_ROUNDS);
      const shipSquares = state.ships.map((ship) => ship.square);
      const allNodeSquares = nodeSquares(state);
      const chargedSquares = allNodeSquares.filter(
        (square) => nodeStateAt(state, square) === "charged",
      );
      const inactiveSquares = allNodeSquares.filter(
        (square) => nodeStateAt(state, square) === "inactive",
      );

      expect(chargedSquares).toHaveLength(TARGET_CHARGED_NODES);
      expect(inactiveSquares).toHaveLength(INACTIVE_NODE_COUNT);

      for (const square of chargedSquares) {
        const others = allNodeSquares.filter(
          (candidate) => squareName(candidate) !== squareName(square),
        );
        expect(
          satisfiesOrdinaryPoolConstraints(
            square,
            others,
            shipSquares,
            "strict",
          ),
        ).toBe(true);
      }

      for (const square of inactiveSquares) {
        const others = allNodeSquares.filter(
          (candidate) => squareName(candidate) !== squareName(square),
        );
        // The draw order within the dealt trio is not recoverable from the
        // finished state, so this checks the constraint every one of the
        // three draws shares — the widened pool — rather than singling out
        // the strict first draw from the widened second and third.
        // `nodeQueue.test.ts` already checks that distinction directly
        // against `refillQueue` in isolation.
        expect(
          satisfiesOrdinaryPoolConstraints(
            square,
            others,
            shipSquares,
            "widened",
          ),
        ).toBe(true);
      }
    },
  );

  it.each(SEEDS)(
    "draws every refill's three squares from the right pool, never the outer edge, and never the fallback (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);
      expect(run.refills.length).toBeGreaterThan(10);

      for (const refill of run.refills) {
        const [first, second, third] = refill.newNodes;

        expect(
          satisfiesOrdinaryPoolConstraints(
            first.square,
            refill.occupiedBeforeRefill,
            run.shipSquares,
            "strict",
          ),
        ).toBe(true);
        expect(
          satisfiesOrdinaryPoolConstraints(
            second.square,
            [...refill.occupiedBeforeRefill, first.square],
            run.shipSquares,
            "widened",
          ),
        ).toBe(true);
        expect(
          satisfiesOrdinaryPoolConstraints(
            third.square,
            [...refill.occupiedBeforeRefill, first.square, second.square],
            run.shipSquares,
            "widened",
          ),
        ).toBe(true);

        for (const { square } of refill.newNodes) {
          expect(square.row).not.toBe(1);
          expect(square.row).not.toBe(BOARD_SIZE);
          expect(square.column).not.toBe(COLUMN_LETTERS[0]);
          expect(square.column).not.toBe(
            COLUMN_LETTERS[COLUMN_LETTERS.length - 1],
          );
        }
      }
    },
  );

  it.each(SEEDS)(
    "places the rare direct-fourth node legally under the widened pool, if the run ever sees one (seed %d)",
    (seed) => {
      // The shortfall this covers — all four charged nodes running out on
      // the same turn — was not observed once across this file's runs
      // (`charging.test.ts` and `endOfTurn.test.ts` exercise it directly,
      // by construction). This still checks it if it happens, so the check
      // is not silently skipped should a future change make it common.
      const run = runEconomy(seed, PLIES_TO_RUN);

      for (const placement of run.directFourths) {
        expect(placement.square.row).not.toBe(1);
        expect(placement.square.row).not.toBe(BOARD_SIZE);
        expect(
          satisfiesOrdinaryPoolConstraints(
            placement.square,
            placement.occupiedBefore,
            run.shipSquares,
            "widened",
          ),
        ).toBe(true);
      }
    },
  );
});

describe("the spread the weighting buys (Appendix B)", () => {
  it("keeps a freshly refilled trio's mean smallest pairwise gap above a floor, and measurably above what an unweighted draw from the same pools would produce", () => {
    const weightedGaps: number[] = [];
    const unweightedGaps: number[] = [];
    let comparisonSeed = 424242;

    for (const seed of SEEDS) {
      const run = runEconomy(seed, PLIES_TO_RUN);

      for (const refill of run.refills) {
        weightedGaps.push(
          smallestPairwiseGap(refill.newNodes.map((node) => node.square)),
        );

        // The unweighted comparison draws from exactly the same pools the
        // real refill saw, uniformly rather than by §3.2's weighting, via a
        // seed stream of its own so it never disturbs the seed the economy
        // above is actually driven by.
        const strictPool = legalNodePool(
          refill.occupiedBeforeRefill,
          run.shipSquares,
        );
        const [firstSquare, seedAfterFirst] = drawUniformSquare(
          strictPool,
          comparisonSeed,
        );
        const widenedPoolAfterFirst = legalNodePool(
          [...refill.occupiedBeforeRefill, firstSquare],
          run.shipSquares,
          "widened",
        );
        const [secondSquare, seedAfterSecond] = drawUniformSquare(
          widenedPoolAfterFirst,
          seedAfterFirst,
        );
        const widenedPoolAfterSecond = legalNodePool(
          [...refill.occupiedBeforeRefill, firstSquare, secondSquare],
          run.shipSquares,
          "widened",
        );
        const [thirdSquare, seedAfterThird] = drawUniformSquare(
          widenedPoolAfterSecond,
          seedAfterSecond,
        );
        comparisonSeed = seedAfterThird;

        unweightedGaps.push(
          smallestPairwiseGap([firstSquare, secondSquare, thirdSquare]),
        );
      }
    }

    expect(weightedGaps.length).toBeGreaterThan(100);
    expect(weightedGaps.length).toBe(unweightedGaps.length);

    const meanWeightedGap = average(weightedGaps);
    const meanUnweightedGap = average(unweightedGaps);

    expect(meanWeightedGap).toBeGreaterThan(MINIMUM_MEAN_REFILL_GAP);
    expect(meanWeightedGap - meanUnweightedGap).toBeGreaterThan(
      MINIMUM_SPREAD_ADVANTAGE,
    );
  });
});

describe("how often the queue is swept (Appendix B)", () => {
  it("keeps the mean turns between refills within a generous band around the measured figure", () => {
    let totalPlies = 0;
    let totalRefills = 0;

    for (const seed of SEEDS) {
      const run = runEconomy(seed, PLIES_TO_RUN);
      totalPlies += run.samples.length;
      totalRefills += run.refills.length;
    }

    expect(totalRefills).toBeGreaterThan(10);
    const meanPliesBetweenRefills = totalPlies / totalRefills;

    expect(meanPliesBetweenRefills).toBeGreaterThan(
      MINIMUM_MEAN_PLIES_BETWEEN_REFILLS,
    );
    expect(meanPliesBetweenRefills).toBeLessThan(
      MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS,
    );
  });
});

describe("rotation actually cycles (Appendix B)", () => {
  it("carries every inactive node that survives long enough through priority three at least once", () => {
    // A rotation is a 3-cycle (1→2, 2→3, 3→1), so a node dealt priority 1
    // reaches 3 after exactly two rotations. A segment between refills of
    // three samples or more — the dealt ply itself, plus at least two
    // rotations — is therefore guaranteed by the rule itself to have shown
    // priority 3 to all three of its nodes; this checks that guarantee
    // actually holds end to end, through the real end-of-turn sequence,
    // rather than only against `rotatePriority` in isolation
    // (`nodeQueue.test.ts` already covers that).
    const MINIMUM_SEGMENT_LENGTH = 3;
    let segmentsChecked = 0;

    for (const seed of SEEDS) {
      const run = runEconomy(seed, PLIES_TO_RUN);

      let previousNames: readonly string[] | null = null;
      let segmentLength = 0;
      let segmentMaxPriority = new Map<string, number>();

      const finalizeSegment = () => {
        if (previousNames !== null && segmentLength >= MINIMUM_SEGMENT_LENGTH) {
          segmentsChecked++;
          for (const name of previousNames) {
            expect(segmentMaxPriority.get(name)).toBe(TOP_NODE_PRIORITY);
          }
        }
      };

      for (const sample of run.samples) {
        const currentNames = [...sample.inactiveByName.keys()].sort();
        const sameSegment =
          previousNames !== null &&
          currentNames.length === previousNames.length &&
          currentNames.every((name, i) => name === previousNames![i]);

        if (!sameSegment) {
          finalizeSegment();
          previousNames = currentNames;
          segmentLength = 0;
          segmentMaxPriority = new Map();
        }

        segmentLength++;
        for (const [name, priority] of sample.inactiveByName) {
          segmentMaxPriority.set(
            name,
            Math.max(segmentMaxPriority.get(name) ?? 0, priority),
          );
        }
      }
      finalizeSegment();
    }

    expect(segmentsChecked).toBeGreaterThan(50);
  });
});
