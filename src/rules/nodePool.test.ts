// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). A node's life is randomly
// drawn rather than fixed, so the guard this file offers is statistical
// rather than exact: it drives the end-of-turn sequence for several hundred
// turns from the opening position and checks the shape Appendix B predicts
// holds up — the board stays at fifteen nodes, five of them charged, the
// inactive pool stays comfortably populated, nodes do not run out in
// clumps, and the pressure weighting keeps every node's wait between
// charges bounded.
//
// A node's life ends in retirement rather than recovery: it leaves the board
// and one new inactive node appears elsewhere (§3.2, §8.2). That makes two
// things true that were not true of a fixed board: a square's identity does
// not persist across a retirement, so waits and charge counts are tracked
// per node *life*, not per square (see `nodeWaitStats` below); and every
// appearance — the opening deal's fifteen and every later replacement — has
// somewhere new to be legal about, which this file now checks directly
// against the board as it stood at that moment, not just at the deal.
//
// Every bound below was measured for fifteen mortal nodes, by running this
// file's own `runEconomy` over `SEEDS` at `PLIES_TO_RUN` turns each (see each
// constant's comment for the figure that run produced) — five seeds chosen
// over more turns, per this run's own cost: a retirement now costs a pool
// scan per placement, and five seeds already gives every bound here
// generous margin without the suite noticeably slowing down. Since the
// generator is seeded, this measurement is exactly reproducible; a broader
// sweep (ten seeds, and forty seeds at 800 turns) was also run by hand while
// choosing these bounds, and is noted where it changed the margin worth
// leaving.

import { describe, expect, it } from "vitest";
import { COLUMN_LETTERS, type Square, squareName } from "./board";
import { isBay } from "./bays";
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
 * Appendix B now predicts about 7½ of the fifteen inactive at any moment;
 * measured over `SEEDS` at `PLIES_TO_RUN` turns, the lowest instantaneous
 * count seen was 5. The floor here leaves margin well below that, so this
 * fails only if the economy actually collapses rather than merely drifting.
 */
const MINIMUM_INACTIVE_NODES = 3;

/**
 * How often two or more nodes are allowed to run out on the same turn, as a
 * share of turns played. Measured over `SEEDS` this sits at or under 2.4%;
 * the bound below leaves generous margin above that.
 */
const MAXIMUM_MULTI_EXPIRY_SHARE = 0.1;

/**
 * No turn should run out anything close to all five charged nodes at once.
 * Measured over `SEEDS` the observed maximum is 3; this leaves margin above
 * that while still catching a board that has lost its spread.
 */
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_NODES - 1;

/**
 * The longest wait, in turns, any one node's own life is allowed between
 * appearing inactive — from the deal, or from a replacement (§3.2, §8.2) —
 * and being charged. A node cannot retire without first being charged
 * (§8.2), so nothing here waits for ever, but under a uniform draw this
 * tail would in principle be unbounded. Measured over `SEEDS` the observed
 * maximum is 162 turns; a broader by-hand sweep (forty seeds, 800 turns)
 * reached 257. The bound below leaves generous margin above both, so it is
 * a loose sanity check on the economy rather than a guard on the pressure
 * weighting itself — `chargeDraw.test.ts`'s "weighted by pressure" describe
 * block (§8.2) is what actually guards the weighting, by asserting its 2:1
 * ratio directly.
 */
const MAXIMUM_TURNS_BETWEEN_CHARGES = 400;

/**
 * How many charges the run should produce in total, over 500 turns and no
 * ship activity. Measured at 85 for every one of `SEEDS`; the floor here
 * leaves generous margin below that, so this fails only if the economy's
 * overall pace of charging actually collapses.
 */
const MINIMUM_TOTAL_CHARGES = 40;

/**
 * How many of the 121 interior squares (C3-M13) a long run, across `SEEDS`,
 * should place a node on at least once — either at the deal or as a
 * replacement. Measured at 116; the floor leaves margin below that.
 */
const MINIMUM_DISTINCT_SQUARES_SEEN = 100;

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
  readonly nodesOnBays: number;
  readonly charged: number;
  readonly inactive: number;
  readonly depleted: number;
  readonly nodesRanOutThisPly: number;
  readonly chargedSquareNames: readonly string[];
  readonly replacements: readonly Replacement[];
}

interface EconomyRun {
  readonly samples: readonly EconomySample[];
  /** The board's fifteen squares before the first ply of the run — the deal's own placements. */
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
      nodesOnBays: nodeSquares(result.state).filter(isBay).length,
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
 * Every square that ever held a node during the run — the deal's fifteen
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

/** Which quadrant of the interior a square falls in, or `undefined` for the centre row or column, which belongs to none. */
function quadrantOf(
  square: Square,
): "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | undefined {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const left = columnIndex < 7;
  const right = columnIndex > 7;
  const top = square.row < 8;
  const bottom = square.row > 8;

  if (left && top) return "topLeft";
  if (right && top) return "topRight";
  if (left && bottom) return "bottomLeft";
  if (right && bottom) return "bottomRight";
  return undefined;
}

describe("the long-run node economy (Appendix B)", () => {
  it.each(SEEDS)(
    "holds exactly fifteen nodes at every turn, none of them on a bay (seed %d)",
    (seed) => {
      const { samples } = runEconomy(seed, PLIES_TO_RUN);

      samples.forEach((sample, i) => {
        expect(sample.nodeCount, `ply ${i}`).toBe(NODE_COUNT);
        expect(sample.nodesOnBays, `ply ${i}`).toBe(0);
      });
    },
  );

  it.each(SEEDS)(
    "places every node — the deal's fifteen and every replacement — on a square legal under §3.2 at the moment it appears (seed %d)",
    (seed) => {
      const { initialSquares, shipSquares, samples } = runEconomy(
        seed,
        PLIES_TO_RUN,
      );

      // The deal's own fifteen: each is checked against the other fourteen,
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
          expect(isBay(newSquare), `ply ${i}: ${squareName(newSquare)}`).toBe(
            false,
          );
          boardSquares = [...boardSquares, newSquare];
        }
      });
    },
  );

  it.each(SEEDS)(
    "never exceeds five charged, and is back at five by the end of the run — a shortfall stays legal (seed %d)",
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

  it("keeps roughly five charged, two or three depleted and seven or eight inactive in the steady state", () => {
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

    // Measured (this seed, this run): meanDepleted ~1.88, meanInactive
    // ~8.12, against Appendix B's prediction of about 2½ and 7½. The gap is
    // expected and confirms the model rather than contradicting it: no ship
    // ever moves here, so every charged node drains at the empty rate of 2.1
    // a turn and lives about 60 / 2.1 = 29 turns, where Appendix B's twenty
    // is a mix of empty and held turns. Redo its arithmetic with 29: the
    // charged share is fixed at 5 of 15, so a whole life runs about 3 x 29 =
    // 87 turns, of which ~10 are depleted and ~48 inactive — 1.7 depleted
    // and 8.2 inactive of the fifteen, which is what came out. A played game
    // holds nodes and so sits nearer Appendix B's figures; do not "correct"
    // the document to match this file. The bounds below leave generous
    // margin either side of what was measured.
    expect(meanDepleted).toBeGreaterThan(0.5);
    expect(meanDepleted).toBeLessThan(4);
    expect(meanInactive).toBeGreaterThan(6);
    expect(meanInactive).toBeLessThan(10);
  });

  /**
   * Measured over `SEEDS` at `PLIES_TO_RUN` turns: 116 of the 121 interior
   * squares held a node at least once, and each quadrant's share of the
   * squares seen was between about 0.24 and 0.28 (a by-hand sweep of ten
   * seeds reached full coverage of all 121, split evenly across the four
   * quadrants). The bounds below leave generous margin under and around
   * those figures — this is not a claim of uniformity (§3.2's adjacency
   * rule favours squares nearer the interior's edge over its middle, and a
   * replacement's pool always excludes the square just vacated), only that
   * placement over a long run is not clustering in one region.
   */
  it("spreads the squares it occupies across the whole legal interior, over a long run", () => {
    const seenSquares = new Set<string>();
    const quadrantCounts = {
      topLeft: 0,
      topRight: 0,
      bottomLeft: 0,
      bottomRight: 0,
    };
    let totalQuadrantSquares = 0;

    for (const seed of SEEDS) {
      const run = runEconomy(seed, PLIES_TO_RUN);
      for (const name of allOccupiedSquareNames(run)) {
        seenSquares.add(name);
      }
    }

    for (const name of seenSquares) {
      const column = name[0] as Square["column"];
      const row = Number(name.slice(1));
      const quadrant = quadrantOf({ column, row });
      if (quadrant !== undefined) {
        quadrantCounts[quadrant]++;
        totalQuadrantSquares++;
      }
    }

    expect(seenSquares.size).toBeGreaterThan(MINIMUM_DISTINCT_SQUARES_SEEN);

    for (const count of Object.values(quadrantCounts)) {
      const share = count / totalQuadrantSquares;
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.3);
    }
  });
});
