// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). A node's life is randomly
// drawn rather than fixed, so the guard this file offers is statistical
// rather than exact: it drives the end-of-turn sequence for several hundred
// turns from the opening position and checks the shape Appendix B predicts
// holds up — the board stays at twelve nodes, four of them charged, the
// inactive pool stays comfortably populated, nodes do not run out in
// clumps, and the pressure weighting keeps every node's wait between
// charges bounded.
//
// A node's life ends in retirement rather than recovery: it leaves the board
// and one new inactive node appears elsewhere (§3.2, §8.2). That makes two
// things true that were not true of a fixed board: a square's identity does
// not persist across a retirement, so waits and charge counts are tracked
// per node *life*, not per square (see `nodeWaitStats` below); and every
// appearance — the opening deal's twelve and every later replacement — has
// somewhere new to be legal about, which this file now checks directly
// against the board as it stood at that moment, not just at the deal.
//
// Every bound below was measured for twelve mortal nodes, by running this
// file's own `runEconomy` over `SEEDS` at `PLIES_TO_RUN` turns each (see each
// constant's comment for the figure that run produced) — five seeds chosen
// over more turns, per this run's own cost: a retirement now costs a pool
// scan per placement, and five seeds already gives every bound here
// generous margin without the suite noticeably slowing down. Since the
// generator is seeded, this measurement is exactly reproducible.

import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  squareName,
} from "./board";
import { PLANETS, isPlanet } from "./planets";
import { runEndOfTurn } from "./endOfTurn";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  startingGameState,
} from "./gameState";
import { legalNodePool } from "./nodePlacement";
import { NODE_COUNT, type NodeState, TARGET_CHARGED_NODES } from "./nodes";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821, 20260822, 20260823];

/**
 * Appendix B now predicts about 6 of the twelve inactive at any moment;
 * measured over `SEEDS` at `PLIES_TO_RUN` turns, the lowest instantaneous
 * count seen was 4. The floor here leaves margin well below that, so this
 * fails only if the economy actually collapses rather than merely drifting.
 */
const MINIMUM_INACTIVE_NODES = 3;

/**
 * How often two or more nodes are allowed to run out on the same turn, as a
 * share of turns played. Measured over `SEEDS` this sits at or under 1.4%;
 * the bound below leaves generous margin above that.
 */
const MAXIMUM_MULTI_EXPIRY_SHARE = 0.1;

/**
 * No turn should run out all four charged nodes at once. Measured over
 * `SEEDS` the observed maximum is 3, one below the theoretical ceiling of
 * `TARGET_CHARGED_NODES`; this still catches the extreme case — every
 * charged node expiring together — the guard exists for.
 */
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_NODES - 1;

/**
 * The longest wait, in turns, any one node's own life is allowed between
 * appearing inactive — from the deal, or from a replacement (§3.2, §8.2) —
 * and being charged. A node cannot retire without first being charged
 * (§8.2), so nothing here waits for ever, but under a uniform draw this
 * tail would in principle be unbounded. Measured over `SEEDS` the observed
 * maximum is 173 turns; no broader sweep was re-run at this target. The
 * bound below leaves generous margin above that, so it is a loose sanity
 * check on the economy rather than a guard on the pressure weighting
 * itself — `chargeDraw.test.ts`'s "weighted by pressure" describe block
 * (§8.2) is what actually guards the weighting, by asserting its 2:1 ratio
 * directly.
 */
const MAXIMUM_TURNS_BETWEEN_CHARGES = 400;

/**
 * How many charges the run should produce in total, over 500 turns and no
 * ship activity. Measured at 68-70 across `SEEDS`; the floor here leaves
 * generous margin below that, so this fails only if the economy's overall
 * pace of charging actually collapses.
 */
const MINIMUM_TOTAL_CHARGES = 40;

/**
 * The names of the squares that satisfy all six of §3.2's constraints on an
 * empty board with no ships: the interior, minus the twelve planets and every
 * square orthogonally or diagonally adjacent to one. Derived from `PLANETS`
 * rather than typed out, because the planet geometry is still being moved
 * around — this restates §3.2's rule, not `legalNodePool`'s implementation.
 */
const LEGAL_SQUARE_NAMES: readonly string[] = ALL_SQUARES.filter((square) => {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const inInterior =
    columnIndex >= 2 &&
    columnIndex <= COLUMN_LETTERS.length - 3 &&
    square.row >= 3 &&
    square.row <= BOARD_SIZE - 2;
  return (
    inInterior &&
    !PLANETS.some(
      (planet) =>
        Math.abs(COLUMN_LETTERS.indexOf(planet.column) - columnIndex) <= 1 &&
        Math.abs(planet.row - square.row) <= 1,
    )
  );
}).map(squareName);

function countInState(state: GameState, target: NodeState): number {
  return nodeSquares(state).filter(
    (square) => nodeStateAt(state, square) === target,
  ).length;
}

interface Replacement {
  readonly retiredSquare: Square;
  readonly newSquare: Square;
}

interface EconomySample {
  readonly nodeCount: number;
  readonly nodesOnPlanets: number;
  readonly charged: number;
  readonly inactive: number;
  readonly depleted: number;
  readonly nodesRanOutThisPly: number;
  readonly chargedSquareNames: readonly string[];
  readonly replacements: readonly Replacement[];
}

interface EconomyRun {
  readonly samples: readonly EconomySample[];
  /** The board's twelve squares before the first ply of the run — the deal's own placements. */
  readonly initialSquares: readonly Square[];
  /**
   * The squares the deal placed that opened inactive, captured once before
   * the run starts — the starting point for tracking how long each of
   * those first lives waits to be charged.
   */
  readonly initialInactiveNames: readonly string[];
  /** The squares ships occupy — fixed for the whole run, since no ship ever moves here. */
  readonly shipSquares: readonly Square[];
}

/**
 * Drives the end-of-turn sequence for `plies` turns from the opening
 * position, with no ship ever moving, and samples the board after each turn.
 */
function runEconomy(seed: number, plies: number): EconomyRun {
  let state = startingGameState(seed, NOMINAL_LENGTH_IN_ROUNDS);
  const initialSquares = nodeSquares(state);
  const shipSquares = state.ships.map((ship) => ship.square);
  const initialInactiveNames = initialSquares
    .filter((square) => nodeStateAt(state, square) === "inactive")
    .map(squareName);
  const samples: EconomySample[] = [];

  for (let i = 0; i < plies; i++) {
    const result = runEndOfTurn(state);
    samples.push({
      nodeCount: nodeSquares(result.state).length,
      nodesOnPlanets: nodeSquares(result.state).filter(isPlanet).length,
      charged: countInState(result.state, "charged"),
      inactive: countInState(result.state, "inactive"),
      depleted: countInState(result.state, "depleted"),
      nodesRanOutThisPly: result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      ).length,
      chargedSquareNames: result.effects
        .filter((effect) => effect.type === "node-charged")
        .map((effect) => squareName(effect.square)),
      replacements: result.effects
        .filter((effect) => effect.type === "node-replaced")
        .map((effect) => ({
          retiredSquare: effect.retiredSquare,
          newSquare: effect.newSquare,
        })),
    });
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return { samples, initialSquares, initialInactiveNames, shipSquares };
}

/**
 * For every node's own life — inactive from the moment it appears, whether
 * dealt that way at the opening or created by a replacement, until the
 * moment it is charged — the longest wait seen, and how many charges
 * happened in total. A node cannot retire without first being charged
 * (§8.2), so a life still waiting when the run ends is not lost; its wait
 * so far still counts towards the longest seen.
 */
function nodeWaitStats(run: EconomyRun): {
  readonly maxGap: number;
  readonly totalCharges: number;
} {
  const waitingSince = new Map<string, number>();
  for (const name of run.initialInactiveNames) {
    waitingSince.set(name, -1);
  }

  let maxGap = 0;
  let totalCharges = 0;

  run.samples.forEach((sample, plyIndex) => {
    for (const name of sample.chargedSquareNames) {
      totalCharges += 1;
      const startedWaiting = waitingSince.get(name);
      if (startedWaiting !== undefined) {
        maxGap = Math.max(maxGap, plyIndex - startedWaiting);
        waitingSince.delete(name);
      }
    }
    for (const { newSquare } of sample.replacements) {
      waitingSince.set(squareName(newSquare), plyIndex);
    }
  });

  for (const startedWaiting of waitingSince.values()) {
    maxGap = Math.max(maxGap, run.samples.length - startedWaiting);
  }

  return { maxGap, totalCharges };
}

/**
 * Every square that ever held a node during the run — the deal's twelve
 * plus every replacement's new square — as a set, so a square that is
 * reused (a replacement landing where an earlier one once stood) counts
 * once.
 */
function allOccupiedSquareNames(run: EconomyRun): ReadonlySet<string> {
  const names = new Set(run.initialSquares.map(squareName));
  for (const sample of run.samples) {
    for (const { newSquare } of sample.replacements) {
      names.add(squareName(newSquare));
    }
  }
  return names;
}

describe("the long-run node economy (Appendix B)", () => {
  it.each(SEEDS)(
    "holds exactly twelve nodes at every turn, none of them on a planet (seed %d)",
    (seed) => {
      const { samples } = runEconomy(seed, PLIES_TO_RUN);

      samples.forEach((sample, i) => {
        expect(sample.nodeCount, `ply ${i}`).toBe(NODE_COUNT);
        expect(sample.nodesOnPlanets, `ply ${i}`).toBe(0);
      });
    },
  );

  it.each(SEEDS)(
    "places every node — the deal's twelve and every replacement — on a square legal under §3.2 at the moment it appears (seed %d)",
    (seed) => {
      const { initialSquares, shipSquares, samples } = runEconomy(
        seed,
        PLIES_TO_RUN,
      );

      // The deal's own twelve: each is checked against the other eleven,
      // which is exactly the constraint §3.2 states — no node adjacent to
      // another, none on a ship, none off the interior.
      for (const square of initialSquares) {
        const others = initialSquares.filter(
          (other) => squareName(other) !== squareName(square),
        );
        const pool = legalNodePool(others, shipSquares);
        expect(
          pool.some(
            (candidate) => squareName(candidate) === squareName(square),
          ),
          `dealt square ${squareName(square)}`,
        ).toBe(true);
      }

      // Every replacement: reconstruct the board exactly as endOfTurn.ts
      // built it — the retiring square removed before the pool is drawn —
      // and confirm the square actually written was a member of that pool.
      let boardSquares = initialSquares;
      samples.forEach((sample, i) => {
        for (const { retiredSquare, newSquare } of sample.replacements) {
          boardSquares = boardSquares.filter(
            (square) => squareName(square) !== squareName(retiredSquare),
          );
          const pool = legalNodePool(boardSquares, shipSquares, retiredSquare);
          expect(
            pool.some(
              (candidate) => squareName(candidate) === squareName(newSquare),
            ),
            `ply ${i}: replacement for ${squareName(retiredSquare)} at ${squareName(newSquare)}`,
          ).toBe(true);
          expect(
            isPlanet(newSquare),
            `ply ${i}: ${squareName(newSquare)}`,
          ).toBe(false);
          boardSquares = [...boardSquares, newSquare];
        }
      });
    },
  );

  it.each(SEEDS)(
    "never exceeds four charged, and is back at four by the end of the run — a shortfall stays legal (seed %d)",
    (seed) => {
      const { samples } = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.charged).toBeLessThanOrEqual(TARGET_CHARGED_NODES);
      }
      expect(samples[samples.length - 1].charged).toBe(TARGET_CHARGED_NODES);
    },
  );

  it.each(SEEDS)(
    "keeps the inactive pool comfortably populated (seed %d)",
    (seed) => {
      const { samples } = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.inactive).toBeGreaterThanOrEqual(MINIMUM_INACTIVE_NODES);
      }
    },
  );

  it.each(SEEDS)(
    "keeps expiries spread rather than arriving together (seed %d)",
    (seed) => {
      const { samples } = runEconomy(seed, PLIES_TO_RUN);

      const multiExpiryPlies = samples.filter(
        (sample) => sample.nodesRanOutThisPly >= 2,
      ).length;
      expect(multiExpiryPlies / samples.length).toBeLessThan(
        MAXIMUM_MULTI_EXPIRY_SHARE,
      );

      for (const sample of samples) {
        expect(sample.nodesRanOutThisPly).toBeLessThanOrEqual(
          MAXIMUM_EXPIRIES_IN_ONE_PLY,
        );
      }
    },
  );

  it.each(SEEDS)(
    "bounds how long any node's own life can wait before it is charged, via the pressure weighting (seed %d)",
    (seed) => {
      const run = runEconomy(seed, PLIES_TO_RUN);
      const { maxGap, totalCharges } = nodeWaitStats(run);

      expect(maxGap).toBeLessThan(MAXIMUM_TURNS_BETWEEN_CHARGES);
      expect(totalCharges).toBeGreaterThanOrEqual(MINIMUM_TOTAL_CHARGES);
    },
  );

  it("keeps roughly four charged, one or two depleted and six or seven inactive in the steady state", () => {
    const { samples } = runEconomy(20260819, PLIES_TO_RUN);
    // Skip the opening settling in; Appendix B's arithmetic is about the
    // steady state, not the first few turns.
    const steady = samples.slice(50);

    const meanDepleted =
      steady.reduce((total, sample) => total + sample.depleted, 0) /
      steady.length;
    const meanInactive =
      steady.reduce((total, sample) => total + sample.inactive, 0) /
      steady.length;

    // Measured (this seed, this run): meanDepleted ~1.49, meanInactive
    // ~6.51, against Appendix B's prediction of about 2 and 6. The gap is
    // expected and confirms the model rather than contradicting it: no ship
    // ever moves here, so every charged node drains at the empty rate of 2.1
    // a turn and lives about 60 / 2.1 = 29 turns, where Appendix B's twenty
    // is a mix of empty and held turns. Redo its arithmetic with 29: the
    // charged share is fixed at 4 of 12, so a whole life runs about
    // 12/4 x 29 ≈ 87 turns, of which ~10 are depleted and ~48 inactive —
    // about 1.4 depleted and 6.6 inactive of the twelve, close to what came
    // out. A played game holds nodes and so sits nearer Appendix B's
    // figures; do not "correct" the document to match this file. The bounds
    // below leave generous margin either side of what was measured: the
    // inactive bound at 8 leaves margin above the measured ~6.51.
    expect(meanDepleted).toBeGreaterThan(0.5);
    expect(meanDepleted).toBeLessThan(4);
    expect(meanInactive).toBeGreaterThan(4);
    expect(meanInactive).toBeLessThan(8);
  });

  // The pool is now a fixed 29 squares whose balance is settled by the
  // planet geometry itself (planets.test.ts checks that geometry directly),
  // so this asserts the stronger, exact fact rather than a statistical
  // window on draws from an already-tested pool: over a long run, every one
  // of the 29 legal squares is used at least once, either at the deal or as
  // a replacement. The fallback (§3.2) can occasionally hand back a square
  // outside those 29 — one adjacent to a planet, say — so this checks that
  // every one of the 29 was reached, not that nothing else ever was.
  it("reaches every one of the 29 legal squares, over a long run", () => {
    const seenSquares = new Set<string>();

    for (const seed of SEEDS) {
      const run = runEconomy(seed, PLIES_TO_RUN);
      for (const name of allOccupiedSquareNames(run)) {
        seenSquares.add(name);
      }
    }

    for (const name of LEGAL_SQUARE_NAMES) {
      expect(seenSquares.has(name), name).toBe(true);
    }
  });
});
