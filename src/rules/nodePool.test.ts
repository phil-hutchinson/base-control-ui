// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). Under 0.12 a node's life is
// randomly drawn rather than fixed, so the guard this file offers is
// statistical rather than exact: it drives the end-of-turn sequence for
// several hundred turns from the opening position and checks the shape
// Appendix B predicts holds up — the board stays at five charged, the inactive
// pool stays comfortably populated, nodes do not run out in clumps, and the
// pressure weighting keeps every node's wait between charges bounded.
//
// 0.11's opening stagger kept five nodes charged together from running out
// together forever after (rules.md's old "lockstep" concern), and this file
// used to assert "at most one node runs out per turn" as a consequence of
// it. 0.12 drops the stagger — nothing can form that lockstep any more, since
// every node's drain is drawn independently — and two nodes coinciding is
// now ordinary rather than a bug. What replaces the old assertion is a bound
// on how often several coincide, not a claim that they never do.
//
// 0.18 deals the opening position rather than fixing it (§8.1), so this
// file's "opening position" now varies per seed — which five nodes start
// charged, and at what drain or pressure, differs from run to run. Nothing
// here changes as a result: it already runs several seeds, its bounds were
// measured with margin against a dealt board, and the shape it checks is
// about the steady state Appendix B describes, not the first few turns.

import { describe, expect, it } from "vitest";
import { squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import { type GameState, nodeStateAt, startingGameState } from "./gameState";
import {
  FIXED_NODE_SQUARES,
  type NodeState,
  TARGET_CHARGED_NODES,
} from "./nodes";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821];

/**
 * Appendix B predicts nine or ten of the seventeen inactive at any moment; the
 * floor here is well below that, so this fails only if the economy actually
 * collapses rather than merely drifting.
 */
const MINIMUM_INACTIVE_NODES = 4;

/**
 * How often two or more nodes are allowed to run out on the same turn, as a
 * share of turns played. Measured over several seeds this sits under 3%; the
 * bound below leaves generous margin above that.
 */
const MAXIMUM_MULTI_EXPIRY_SHARE = 0.1;

/**
 * No turn should run out anything close to all five charged nodes at once.
 * Measured over several seeds the observed maximum is 3; this leaves margin
 * above that while still catching a board that has lost its spread.
 */
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_NODES - 1;

/**
 * Every one of the seventeen nodes should be charged several times over the
 * run; anything below this over 500 turns means a node is being starved.
 */
const MINIMUM_CHARGES_PER_NODE = 2;

/**
 * The longest gap, in turns, any one node is allowed to wait between
 * successive charges. Under a uniform draw this tail is unbounded — a node
 * could in principle never be drawn again — but at these plies and seeds a
 * uniform draw passes this bound too, so it is a loose sanity check on the
 * economy rather than a guard against the pressure weighting being lost or
 * broken. `chargeDraw.test.ts`'s "weighted by pressure" describe block
 * (§8.2) is the check that actually guards the weighting, by asserting its
 * 2:1 ratio directly.
 */
const MAXIMUM_TURNS_BETWEEN_CHARGES = 400;

function countInState(state: GameState, target: NodeState): number {
  return FIXED_NODE_SQUARES.filter(
    (square) => nodeStateAt(state, square) === target,
  ).length;
}

interface EconomySample {
  readonly charged: number;
  readonly inactive: number;
  readonly depleted: number;
  readonly nodesRanOutThisPly: number;
  readonly chargedSquareNames: readonly string[];
}

/**
 * Drives the end-of-turn sequence for `plies` turns from the opening
 * position, with no ship ever moving, and samples the board after each turn.
 */
function runEconomy(seed: number, plies: number): readonly EconomySample[] {
  let state = startingGameState(seed, NOMINAL_LENGTH_IN_ROUNDS);
  const samples: EconomySample[] = [];

  for (let i = 0; i < plies; i++) {
    const result = runEndOfTurn(state);
    samples.push({
      charged: countInState(result.state, "charged"),
      inactive: countInState(result.state, "inactive"),
      depleted: countInState(result.state, "depleted"),
      nodesRanOutThisPly: result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      ).length,
      chargedSquareNames: result.effects
        .filter((effect) => effect.type === "node-charged")
        .map((effect) => squareName(effect.square)),
    });
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return samples;
}

/**
 * For every node, how many times it was charged over the run and the
 * longest gap, in turns, between two successive charges of it. A node
 * charged fewer than twice has no gap to measure and is reported as `0`.
 */
function chargeStats(samples: readonly EconomySample[]): {
  readonly minChargeCount: number;
  readonly maxGap: number;
} {
  const chargeTurns = new Map<string, number[]>();
  for (const node of FIXED_NODE_SQUARES) {
    chargeTurns.set(squareName(node), []);
  }

  samples.forEach((sample, plyIndex) => {
    for (const name of sample.chargedSquareNames) {
      chargeTurns.get(name)?.push(plyIndex);
    }
  });

  let minChargeCount = Infinity;
  let maxGap = 0;
  for (const turns of chargeTurns.values()) {
    minChargeCount = Math.min(minChargeCount, turns.length);
    for (let i = 1; i < turns.length; i++) {
      maxGap = Math.max(maxGap, turns[i] - turns[i - 1]);
    }
  }

  return { minChargeCount, maxGap };
}

describe("the long-run node economy (Appendix B)", () => {
  it.each(SEEDS)(
    "holds at exactly five charged with no ship activity to help it (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.charged).toBe(TARGET_CHARGED_NODES);
      }
    },
  );

  it.each(SEEDS)(
    "keeps the inactive pool comfortably populated (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.inactive).toBeGreaterThanOrEqual(MINIMUM_INACTIVE_NODES);
      }
    },
  );

  it.each(SEEDS)(
    "keeps expiries spread rather than arriving together (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

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
    "bounds how long any node can wait between charges, via the pressure weighting (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);
      const { minChargeCount, maxGap } = chargeStats(samples);

      expect(minChargeCount).toBeGreaterThanOrEqual(MINIMUM_CHARGES_PER_NODE);
      expect(maxGap).toBeLessThan(MAXIMUM_TURNS_BETWEEN_CHARGES);
    },
  );

  it("keeps roughly two or three nodes depleted and nine or ten inactive in the steady state", () => {
    const samples = runEconomy(20260819, PLIES_TO_RUN);
    // Skip the opening settling in; Appendix B's arithmetic is about the
    // steady state, not the first few turns.
    const steady = samples.slice(50);

    const meanDepleted =
      steady.reduce((total, sample) => total + sample.depleted, 0) /
      steady.length;
    const meanInactive =
      steady.reduce((total, sample) => total + sample.inactive, 0) /
      steady.length;

    expect(meanDepleted).toBeGreaterThan(0.5);
    expect(meanDepleted).toBeLessThan(4);
    expect(meanInactive).toBeGreaterThan(8);
    expect(meanInactive).toBeLessThan(12);
  });
});
