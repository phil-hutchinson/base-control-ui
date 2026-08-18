// The guard Appendix B explicitly asks the app for: drives the end-of-turn
// sequence over a long run under adversarial waking patterns and confirms
// the dormant pool never runs dry.

import { describe, expect, it } from "vitest";
import { squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import { type GameState, startingGameState } from "./gameState";
import {
  hasChargedNodeFinished,
  hasDepletedSiteFinishedCooling,
  SITES,
} from "./sites";

const SITE_NAMES = SITES.map(squareName);

/** A handful of seeds so the replacement draw takes a different path each run. */
const SEEDS = [1, 12345, 987654321, 42, 999983];

/** Long enough to run several full eighteen-ply node life cycles. */
const PLY_COUNT = 200;

/**
 * The floor for the softer assertion: below two, the "random" replacement is
 * effectively forced and players can predict it. Appendix B's own arithmetic
 * predicts a pool of roughly seven.
 */
const MINIMUM_HEALTHY_DORMANT_POOL = 2;

function activeSiteNames(state: GameState): string[] {
  return SITE_NAMES.filter(
    (name) => state.siteStates[name]?.state === "active",
  );
}

function dormantSiteNames(state: GameState): string[] {
  return SITE_NAMES.filter(
    (name) => state.siteStates[name]?.state === "dormant",
  );
}

/**
 * Charges an active site directly, without a move — this guard is about the
 * site economy, not movement, so it drives state rather than `applyMove`.
 */
function chargeSite(state: GameState, name: string): GameState {
  const status = state.siteStates[name];
  if (status === undefined || status.state !== "active") {
    return state;
  }
  return {
    ...state,
    siteStates: {
      ...state.siteStates,
      [name]: { state: "charged", enteredOnPly: state.plyNumber },
    },
  };
}

/**
 * The dormant pool available to step 5's draws this ply, computed
 * independently of `runEndOfTurn`: every currently dormant site, plus every
 * depleted site step 3 is about to cool down, against every charged node
 * step 4 is about to run out. If this is never negative, the pool is never
 * empty when a replacement is needed — the hard assertion Appendix B asks
 * for.
 */
function poolMarginBeforeThisPly(state: GameState): number {
  let dormant = 0;
  let cooling = 0;
  let runningOut = 0;

  for (const name of SITE_NAMES) {
    const status = state.siteStates[name];
    if (status === undefined) {
      continue;
    }
    if (status.state === "dormant") {
      dormant += 1;
    } else if (
      status.state === "depleted" &&
      hasDepletedSiteFinishedCooling(status.enteredOnPly, state.plyNumber)
    ) {
      cooling += 1;
    } else if (
      status.state === "charged" &&
      hasChargedNodeFinished(status.enteredOnPly, state.plyNumber)
    ) {
      runningOut += 1;
    }
  }

  return dormant + cooling - runningOut;
}

function assertStateInvariants(state: GameState, plyJustPlayed: number): void {
  expect(Object.keys(state.siteStates).sort()).toEqual([...SITE_NAMES].sort());

  let activeOrCharged = 0;
  for (const name of SITE_NAMES) {
    const status = state.siteStates[name];
    expect(status).toBeDefined();
    expect(["dormant", "active", "charged", "depleted"]).toContain(
      status!.state,
    );
    if (status!.state === "active" || status!.state === "charged") {
      activeOrCharged += 1;
    }
    if (status!.state === "charged" || status!.state === "depleted") {
      expect(status!.enteredOnPly).toBeLessThanOrEqual(plyJustPlayed);
    }
  }

  // §8.1: exactly five sites are active or charged at all times.
  expect(activeOrCharged).toBe(5);
}

/**
 * Runs one seed's game for `PLY_COUNT` plies, deciding which active sites to
 * charge each ply from `wakePattern`, asserting every invariant at every
 * ply, and returning the smallest dormant pool observed.
 */
function runGuardedGame(
  seed: number,
  wakePattern: (state: GameState) => readonly string[],
): number {
  let state = startingGameState(seed);
  let minDormant = dormantSiteNames(state).length;

  for (let i = 0; i < PLY_COUNT; i++) {
    for (const name of wakePattern(state)) {
      state = chargeSite(state, name);
    }

    // The hard Appendix B assertion: the pool never runs dry.
    expect(poolMarginBeforeThisPly(state)).toBeGreaterThanOrEqual(0);

    const plyJustPlayed = state.plyNumber;
    const result = runEndOfTurn(state);
    assertStateInvariants(result.state, plyJustPlayed);

    minDormant = Math.min(minDormant, dormantSiteNames(result.state).length);

    state = {
      ...result.state,
      plyNumber: plyJustPlayed + 1,
      sideToMove: state.sideToMove === "green" ? "red" : "green",
    };
  }

  return minDormant;
}

describe("the Appendix B guard — the dormant pool never runs dry", () => {
  it("holds under the theoretical maximum: every active site charged the instant it appears", () => {
    let minDormant = Number.POSITIVE_INFINITY;

    for (const seed of SEEDS) {
      minDormant = Math.min(
        minDormant,
        runGuardedGame(seed, (state) => activeSiteNames(state)),
      );
    }

    expect(minDormant).toBeGreaterThanOrEqual(MINIMUM_HEALTHY_DORMANT_POOL);
  });

  it("holds under the achievable maximum: at most two sites woken per ply", () => {
    let minDormant = Number.POSITIVE_INFINITY;

    for (const seed of SEEDS) {
      minDormant = Math.min(
        minDormant,
        runGuardedGame(seed, (state) => activeSiteNames(state).slice(0, 2)),
      );
    }

    expect(minDormant).toBeGreaterThanOrEqual(MINIMUM_HEALTHY_DORMANT_POOL);
  });

  it("holds under a staggered pattern that clusters several run-outs into the same ply", () => {
    let minDormant = Number.POSITIVE_INFINITY;

    // Sites sit active, untouched (no clock runs on an active site), for
    // three plies at a time, then every active site is charged at once —
    // deliberately batching several independent nodes' nine-turn clocks onto
    // the same starting ply, so they later run out, and get replaced,
    // together.
    for (const seed of SEEDS) {
      minDormant = Math.min(
        minDormant,
        runGuardedGame(seed, (state) =>
          state.plyNumber % 4 === 0 ? activeSiteNames(state) : [],
        ),
      );
    }

    expect(minDormant).toBeGreaterThanOrEqual(MINIMUM_HEALTHY_DORMANT_POOL);
  });
});
