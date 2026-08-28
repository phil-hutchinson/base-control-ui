// An integration test of the site economy over a long run, with no ship
// activity to interfere. Under 0.10 this file guarded the invariant that the
// dormant pool never ran dry (Appendix B). Under 0.11 running short is a
// legal outcome, so there is no such guarantee left to guard; what Appendix B
// asks for instead is the randomness margin — several sites are always
// active when the charge draw runs, so the draw is never forced and never
// predictable, and the board never falls into lockstep, five nodes running
// out together and being replaced together forever after.

import { describe, expect, it } from "vitest";
import { runEndOfTurn } from "./endOfTurn";
import { type GameState, siteStateAt, startingGameState } from "./gameState";
import { SITES, type SiteState, TARGET_CHARGED_SITES } from "./sites";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;
const MINIMUM_ACTIVE_SITES = 2;

function countInState(state: GameState, target: SiteState): number {
  return SITES.filter((square) => siteStateAt(state, square) === target).length;
}

interface EconomySample {
  readonly charged: number;
  readonly active: number;
  readonly dormant: number;
  readonly nodesRanOutThisPly: number;
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
    });
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return samples;
}

const SEEDS = [20260819, 20260820, 20260821];

describe("the long-run site economy — Appendix B's randomness margin", () => {
  it.each(SEEDS)(
    "stays at five charged with no ship activity to help it (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.charged).toBe(TARGET_CHARGED_SITES);
      }
    },
  );

  it.each(SEEDS)(
    "never lets the active pool fall below a floor of two (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.active).toBeGreaterThanOrEqual(MINIMUM_ACTIVE_SITES);
      }
    },
  );

  it.each(SEEDS)(
    "does not fall into lockstep: at most one node runs out in any single turn (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      for (const sample of samples) {
        expect(sample.nodesRanOutThisPly).toBeLessThanOrEqual(1);
      }
    },
  );

  it("keeps roughly five sites dormant and seven active in the steady state", () => {
    const samples = runEconomy(20260819, PLIES_TO_RUN);
    // Skip the opening stagger settling in; Appendix B's arithmetic is
    // about the steady state, not the first few turns.
    const steady = samples.slice(50);

    const meanDormant =
      steady.reduce((total, sample) => total + sample.dormant, 0) /
      steady.length;
    const meanActive =
      steady.reduce((total, sample) => total + sample.active, 0) /
      steady.length;

    expect(meanDormant).toBeGreaterThan(3);
    expect(meanDormant).toBeLessThan(7);
    expect(meanActive).toBeGreaterThan(5);
    expect(meanActive).toBeLessThan(9);
  });
});
