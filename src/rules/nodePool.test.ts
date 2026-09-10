// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). It drives `runEndOfTurn` from
// real starting positions across a handful of seeds and several hundred
// plies each, at **all three** offered charged-node counts, and checks the
// claims Appendix B makes about the finished game: the queue's invariants
// hold at every ply, every node the run ever places is legal at the moment
// it appears, the weighting measurably spreads a freshly dealt trio, and
// the cadence and node-count figures the appendix quotes are in the right
// neighbourhood, at each count.
//
// A charged node only ever gets a countdown when a ship steps on it (rules.md
// §8.3), and this file drives no ships at all, so `runEconomy` below stands
// in for one: at the start of each ply, if any charged node carries no
// countdown, the first such node in board order is given one. At most
// **one** per ply, mirroring "at most one countdown starts per turn" — the
// same restraint a real game is under, since a turn is one action — which is
// what keeps expiries spread out here exactly as they are in a real game.
// This is a documented stand-in for a ship, not a claim about what a real
// game does, and it is also why this file cannot assert that a charged node
// with a countdown always has a ship on it: its synthetic countdowns never
// do. That invariant belongs to a ship-driven run instead (`seededReplay.test.ts`).
//
// One finding is worth recording here for Appendix B's benefit, since nothing
// else in the codebase measures it: across every seed this file runs, at
// all three counts, and every refill and opening deal within them, section
// 3.2's fallback never had to fire once. "Legal at the moment it appears"
// below is checked by independently recomputing each ordinary constraint
// against the board as the code built it, not by trusting whichever pool
// `legalNodePool` actually returned — a square that failed any of those
// constraints could only ever have come from the fallback, so every
// placement clearing them is itself the fallback-never-fired evidence.

import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareName,
} from "./board";
import { CHARGED_COUNTDOWN_PLIES } from "./countdown";
import { type QueueRefilledEffect, runEndOfTurn } from "./endOfTurn";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
  startingGameState,
} from "./gameState";
import { type NodePoolWidth, legalNodePool } from "./nodePlacement";
import {
  INACTIVE_NODE_COUNT,
  type InactiveNodeDraw,
  TOP_NODE_PRIORITY,
  inactivePriority,
} from "./nodeQueue";
import { CHARGED_NODE_COUNTS, type ChargedNodeCount } from "./nodes";
import { PLANETS, isPlanet } from "./planets";
import { drawIndex } from "./random";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821, 20260822, 20260823];

/**
 * Draws one square uniformly from an already-computed pool — the unweighted
 * comparison draw below needs the same uniform-from-a-pool arithmetic that
 * §3.2's weighting is measured against. Advances the seed exactly once, via
 * `drawIndex`, so a recorded game replays exactly.
 */
function drawUniformSquare(
  pool: readonly Square[],
  seed: number,
): [square: Square, nextSeed: number] {
  const [index, nextSeed] = drawIndex(seed, pool.length);
  return [pool[index], nextSeed];
}

/**
 * The lowest a freshly refilled trio's mean smallest pairwise Chebyshev gap
 * is allowed to fall to, pooled across `SEEDS`. Measured at **4.88 at five
 * charged, 4.79 at four and 4.88 at three**, over an actually-played economy
 * at each count — lower than `nodeQueue.test.ts`'s idealised empty-board
 * figure of roughly 5.1, because a played board's charged nodes, ships and
 * surviving depleted nodes crowd the pool the weighting draws from. The
 * three figures sit within a narrow band rather than trending with the
 * count: fewer charged nodes leave more room on the board, but also mean
 * fewer refills to average across, so the two effects roughly cancel. This
 * single bound leaves comfortable margin below all three figures.
 */
const MINIMUM_MEAN_REFILL_GAP = 4;

/**
 * How much further, on average, the weighted mean gap above must clear the
 * mean gap an unweighted draw from the very same pools produces (computed
 * in this file, from the very same occupied squares, so the comparison is
 * self-contained). Measured at a difference of **1.15 at five charged, 1.08
 * at four and 1.18 at three** (4.88 weighted against 3.72 unweighted at
 * five; 4.79 against 3.71 at four; 4.88 against 3.71 at three); this single
 * bound leaves margin below all three.
 */
const MINIMUM_SPREAD_ADVANTAGE = 0.5;

/**
 * The band the mean number of turns between one refill and the next is
 * allowed to sit in, pooled across `SEEDS`. Measured at roughly **2.2 turns
 * at five charged, 2.8 at four and 3.7 at three**, under the driver this
 * file's header describes: with several charged nodes able to sit at
 * baseline at once and the driver starting a countdown on one of them every
 * single ply that any is waiting, several countdowns run staggered a ply or
 * two apart rather than one at a time, so a charge (and the refill it
 * triggers) comes round far more often than a charged node's own eleven-ply
 * life would suggest on its own — and less often as the count drops, since
 * there are fewer charged nodes for the driver to keep counting down at
 * once. That trend puts three charged nearest the band's ceiling of any of
 * the three counts, though still comfortably inside it. The bounds below
 * leave generous margin either side of all three measured figures.
 */
const MINIMUM_MEAN_PLIES_BETWEEN_REFILLS = 1.5;
const MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS = 5;

/**
 * The band the board's total node count — the game's own charged-node
 * count, three inactive, plus however many are depleted — is allowed to
 * breathe within. Measured range across `SEEDS` and `PLIES_TO_RUN`: **8 to
 * 13, mean ≈12.9, at five charged**; **7 to 11, mean ≈10.9, at four**; and
 * **6 to 9, mean ≈8.9, at three** — one lower throughout at each step down,
 * since one fewer charged node sits on the board at any moment. The driver
 * this file's header describes starts a countdown so eagerly that several
 * traps and exits are typically depleted and counting down at once, closer
 * to the top of each range than the bottom.
 *
 * The lower bound is not fixed here: it is derived per count, inside the
 * `describe.each` block below, as `chargedNodeCount + INACTIVE_NODE_COUNT`.
 * The board is always back at its own charged-node count by the end of
 * every turn, plus exactly three inactive nodes, nothing else guaranteed —
 * so that sum is the board's structural floor at every count, exact by
 * construction rather than a measured margin.
 *
 * `MAXIMUM_TOTAL_NODES` stays a single shared ceiling rather than a figure
 * measured at any one count: it exists to catch a runaway, not to describe
 * a count, and it leaves generous margin above every count's measured
 * range above.
 */
const MAXIMUM_TOTAL_NODES = 14;

/** One ply's sample of the board, taken from `result.state` after `runEndOfTurn`. */
interface EconomySample {
  readonly chargedCount: number;
  readonly depletedCount: number;
  readonly totalNodeCount: number;
  readonly nodesRanOutThisPly: number;
  readonly nodesChargedThisPly: number;
  /** Every inactive node's square name and priority, for the invariant and rotation checks. */
  readonly inactiveByName: ReadonlyMap<string, number>;
}

/** One refill this run observed, with enough reconstructed context to check every draw's legality. */
interface RefillRecord {
  readonly newNodes: readonly InactiveNodeDraw[];
  /**
   * Every square that held a node immediately before this refill's three
   * draws — the discarded survivors already removed — reconstructed from
   * the ply's `before` state and its effects rather than read off any
   * private state `runEndOfTurn` does not expose.
   */
  readonly occupiedBeforeRefill: readonly Square[];
}

interface EconomyRun {
  readonly samples: readonly EconomySample[];
  readonly refills: readonly RefillRecord[];
  readonly shipSquares: readonly Square[];
}

/**
 * Gives a countdown to the first charged node with none, in board order, if
 * any — the stand-in for a ship this file's header describes. Returns
 * `state` unchanged if every charged node already carries one (or there are
 * none).
 */
function startOneCountdown(state: GameState): GameState {
  for (const square of nodeSquares(state)) {
    const name = squareName(square);
    const status = state.nodes[name];
    if (status?.state === "charged" && status.level === 0) {
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [name]: { state: "charged", level: CHARGED_COUNTDOWN_PLIES },
        },
      };
    }
  }
  return state;
}

/**
 * Drives the end-of-turn sequence for `plies` turns from the opening
 * position, with no ship ever moving beyond the synthetic countdown driver
 * this file's header describes, and samples the board after each turn. Also
 * reconstructs, from each ply's `before` state and its effects, exactly what
 * `legalNodePool` saw at the moment of every refill draw — without reaching
 * into `runEndOfTurn`'s private working state — so the legality and spread
 * checks below can be run against the real thing rather than a hand-built
 * stand-in.
 */
function runEconomy(
  seed: number,
  plies: number,
  chargedNodeCount: ChargedNodeCount,
): EconomyRun {
  let state: GameState = startingGameState(seed, {
    lengthInRounds: NOMINAL_LENGTH_IN_ROUNDS,
    chargedNodeCount,
  });
  const shipSquares = state.ships.map((ship) => ship.square);
  const samples: EconomySample[] = [];
  const refills: RefillRecord[] = [];

  for (let i = 0; i < plies; i++) {
    state = startOneCountdown(state);
    const beforeState = state;
    const result = runEndOfTurn(state);

    const refilled = result.effects.find(
      (effect): effect is QueueRefilledEffect =>
        effect.type === "queue-refilled",
    );
    if (refilled !== undefined) {
      const discardedNames = new Set(refilled.discardedSquares.map(squareName));
      const occupiedBeforeRefill = nodeSquares(beforeState).filter(
        (square) => !discardedNames.has(squareName(square)),
      );
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
      nodesChargedThisPly: result.effects.filter(
        (effect) => effect.type === "node-charged",
      ).length,
      inactiveByName,
    });

    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return { samples, refills, shipSquares };
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

describe.each(CHARGED_NODE_COUNTS)(
  "the node economy at %d charged nodes (Appendix B)",
  (chargedNodeCount) => {
    // The board's structural floor at this count: it is always back at its
    // own charged-node count by the end of every turn, plus exactly three
    // inactive nodes, nothing else guaranteed.
    const minimumTotalNodes = chargedNodeCount + INACTIVE_NODE_COUNT;

    describe("the queue's invariants hold at every turn", () => {
      it.each(SEEDS)(
        "holds exactly three inactive nodes at every turn, holding priorities {1, 2, 3} (seed %d)",
        (seed) => {
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

          run.samples.forEach((sample, i) => {
            const priorities = [...sample.inactiveByName.values()];
            expect(priorities, `ply ${i}`).toHaveLength(INACTIVE_NODE_COUNT);
            expect([...priorities].sort(), `ply ${i}`).toEqual([1, 2, 3]);
          });
        },
      );

      it.each(SEEDS)(
        "holds exactly the game's own charged-node count after every turn (seed %d)",
        (seed) => {
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

          run.samples.forEach((sample, i) => {
            expect(sample.chargedCount, `ply ${i}`).toBe(chargedNodeCount);
          });
        },
      );

      it.each(SEEDS)(
        "keeps the board's total node count within a sane, measured band (seed %d)",
        (seed) => {
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

          run.samples.forEach((sample, i) => {
            expect(sample.totalNodeCount, `ply ${i}`).toBeGreaterThanOrEqual(
              minimumTotalNodes,
            );
            expect(sample.totalNodeCount, `ply ${i}`).toBeLessThanOrEqual(
              MAXIMUM_TOTAL_NODES,
            );
          });
        },
      );

      it.each(SEEDS)(
        "runs out at most one charged node, and charges at most two, in any single turn (rules.md §8.3) (seed %d)",
        (seed) => {
          // At most one countdown starts per turn — a turn is one action, and a
          // move onto a charged node is the only way in (§8.3) — so at most one
          // countdown of any kind expires on a given turn: at most one node runs
          // out, and the shortfall it (plus at most one departure) can create is
          // never more than two, which the queue's three inactive nodes always
          // cover. Both bounds are exact, not measured, and hold for every
          // sample of every seed this file runs, with no slack, at any count.
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

          run.samples.forEach((sample, i) => {
            expect(sample.nodesRanOutThisPly, `ply ${i}`).toBeLessThanOrEqual(
              1,
            );
            expect(sample.nodesChargedThisPly, `ply ${i}`).toBeLessThanOrEqual(
              2,
            );
          });
        },
      );
    });

    describe("every new node is legal the moment it appears, and the fallback never fires", () => {
      it.each(SEEDS)(
        "deals an opening board whose nodes are all individually legal (seed %d)",
        (seed) => {
          const state = startingGameState(seed, {
            lengthInRounds: NOMINAL_LENGTH_IN_ROUNDS,
            chargedNodeCount,
          });
          const shipSquares = state.ships.map((ship) => ship.square);
          const allNodeSquares = nodeSquares(state);
          const chargedSquares = allNodeSquares.filter(
            (square) => nodeStateAt(state, square) === "charged",
          );
          const inactiveSquares = allNodeSquares.filter(
            (square) => nodeStateAt(state, square) === "inactive",
          );

          expect(chargedSquares).toHaveLength(chargedNodeCount);
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
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);
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
    });

    describe("the spread the weighting buys", () => {
      it("keeps a freshly refilled trio's mean smallest pairwise gap above a floor, and measurably above what an unweighted draw from the same pools would produce", () => {
        const weightedGaps: number[] = [];
        const unweightedGaps: number[] = [];
        let comparisonSeed = 424242;

        for (const seed of SEEDS) {
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

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

    describe("how often the queue is swept", () => {
      it("keeps the mean turns between refills within a generous band around the measured figure", () => {
        let totalPlies = 0;
        let totalRefills = 0;

        for (const seed of SEEDS) {
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);
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

    describe("rotation actually cycles", () => {
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
          const run = runEconomy(seed, PLIES_TO_RUN, chargedNodeCount);

          let previousNames: readonly string[] | null = null;
          let segmentLength = 0;
          let segmentMaxPriority = new Map<string, number>();

          const finalizeSegment = () => {
            if (
              previousNames !== null &&
              segmentLength >= MINIMUM_SEGMENT_LENGTH
            ) {
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
  },
);
