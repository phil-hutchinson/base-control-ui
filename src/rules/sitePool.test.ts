// An integration test of the site economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). Under 0.12 a node's life is
// randomly drawn rather than fixed, so the guard this file offers is
// statistical rather than exact: it drives the end-of-turn sequence for
// several hundred turns from the opening position and checks the shape
// Appendix B predicts holds up — the board stays at five charged, the active
// pool stays comfortably populated, nodes do not run out in clumps, and the
// pressure weighting keeps every site's wait between charges bounded.
//
// 0.11's opening stagger kept five nodes charged together from running out
// together forever after (rules.md's old "lockstep" concern), and this file
// used to assert "at most one node runs out per turn" as a consequence of
// it. 0.12 drops the stagger — nothing can form that lockstep any more, since
// every node's drain is drawn independently — and two nodes coinciding is
// now ordinary rather than a bug. What replaces the old assertion is a bound
// on how often several coincide, not a claim that they never do.

import { describe, expect, it } from "vitest";
import { squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import { type GameState, siteStateAt, startingGameState } from "./gameState";
import { SITES, type SiteState, TARGET_CHARGED_SITES } from "./sites";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821];

/**
 * Appendix B predicts nine or ten of the seventeen active at any moment; the
 * floor here is well below that, so this fails only if the economy actually
 * collapses rather than merely drifting.
 */
const MINIMUM_ACTIVE_SITES = 4;

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
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_SITES - 1;

/**
 * Every one of the seventeen sites should be charged several times over the
 * run; anything below this over 500 turns means a site is being starved.
 */
const MINIMUM_CHARGES_PER_SITE = 2;

/**
 * The longest gap, in turns, any one site is allowed to wait between
 * successive charges. Under a uniform draw this tail is unbounded — a site
 * could in principle never be drawn again — but at these plies and seeds a
 * uniform draw passes this bound too, so it is a loose sanity check on the
 * economy rather than a guard against the pressure weighting being lost or
 * broken. `chargeDraw.test.ts`'s "weighted by pressure" describe block
 * (§8.2) is the check that actually guards the weighting, by asserting its
 * 2:1 ratio directly.
 */
const MAXIMUM_TURNS_BETWEEN_CHARGES = 400;

function countInState(state: GameState, target: SiteState): number {
  return SITES.filter((square) => siteStateAt(state, square) === target).length;
}

interface EconomySample {
  readonly charged: number;
  readonly active: number;
  readonly dormant: number;
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
      active: countInState(result.state, "active"),
      dormant: countInState(result.state, "dormant"),
      nodesRanOutThisPly: result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      ).length,
      chargedSquareNames: result.effects
        .filter((effect) => effect.type === "site-charged")
        .map((effect) => squareName(effect.square)),
    });
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return samples;
}

/**
 * For every site, how many times it was charged over the run and the
 * longest gap, in turns, between two successive charges of it. A site
 * charged fewer than twice has no gap to measure and is reported as `0`.
 */
function chargeStats(samples: readonly EconomySample[]): {
  readonly minChargeCount: number;
  readonly maxGap: number;
} {
  const chargeTurns = new Map<string, number[]>();
  for (const site of SITES) {
    chargeTurns.set(squareName(site), []);
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

describe("the long-run site economy (Appendix B)", () => {
  it.each(SEEDS)(
    "holds at exactly five charged with no ship activity to help it (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.charged).toBe(TARGET_CHARGED_SITES);
      }
    },
  );

  it.each(SEEDS)(
    "keeps the active pool comfortably populated (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.active).toBeGreaterThanOrEqual(MINIMUM_ACTIVE_SITES);
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
    "bounds how long any site can wait between charges, via the pressure weighting (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);
      const { minChargeCount, maxGap } = chargeStats(samples);

      expect(minChargeCount).toBeGreaterThanOrEqual(MINIMUM_CHARGES_PER_SITE);
      expect(maxGap).toBeLessThan(MAXIMUM_TURNS_BETWEEN_CHARGES);
    },
  );

  it("keeps roughly two or three sites dormant and nine or ten active in the steady state", () => {
    const samples = runEconomy(20260819, PLIES_TO_RUN);
    // Skip the opening settling in; Appendix B's arithmetic is about the
    // steady state, not the first few turns.
    const steady = samples.slice(50);

    const meanDormant =
      steady.reduce((total, sample) => total + sample.dormant, 0) /
      steady.length;
    const meanActive =
      steady.reduce((total, sample) => total + sample.active, 0) /
      steady.length;

    expect(meanDormant).toBeGreaterThan(0.5);
    expect(meanDormant).toBeLessThan(4);
    expect(meanActive).toBeGreaterThan(8);
    expect(meanActive).toBeLessThan(12);
  });
});
