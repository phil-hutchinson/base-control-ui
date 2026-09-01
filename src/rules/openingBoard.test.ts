// Integration cover for a game that opens from a dealt board (rules.md
// §8.1), rather than for a single deal. `sites.test.ts`'s "dealing the
// opening board" block already checks a deal's own shape and distributions
// in isolation; this file checks the properties that only show up once a
// dealt board is actually played from: the economy still runs to
// completion from wherever the deal put it, the first charge draw of the
// game is not a level field once sites open at different dealt pressures,
// and a node dealt deep into its life runs out sooner than one dealt
// fresh.

import { describe, expect, it } from "vitest";
import { squareName } from "./board";
import { runChargeDraw } from "./chargeDraw";
import { runEndOfTurn } from "./endOfTurn";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { type GameState, siteStateAt, startingGameState } from "./gameState";
import {
  NODE_CAPACITY,
  SITES,
  TARGET_CHARGED_SITES,
  dealOpeningBoard,
} from "./sites";

const RUN_TO_COMPLETION_SEEDS = [70210001, 70210002, 70210003];
const RUN_TO_COMPLETION_PLIES = 500;
const RUN_TO_COMPLETION_LENGTH_IN_ROUNDS = 1_000;

describe("a game played from a dealt board runs to completion (rules.md §8.1, §8.6)", () => {
  it.each(RUN_TO_COMPLETION_SEEDS)(
    "runs every dealt node out, recovers a dormant site to active, tops the board back up to five, and charges every one of the seventeen sites at least once (seed %d)",
    (seed) => {
      let state = startingGameState(seed, RUN_TO_COMPLETION_LENGTH_IN_ROUNDS);

      const dealtChargedNames = SITES.map(squareName).filter(
        (name) => state.siteStates[name]?.state === "charged",
      );
      expect(dealtChargedNames).toHaveLength(TARGET_CHARGED_SITES);

      const ranOut = new Set<string>();
      const wentActive = new Set<string>();
      const charged = new Set<string>();

      for (let ply = 0; ply < RUN_TO_COMPLETION_PLIES; ply++) {
        const result = runEndOfTurn(state);
        for (const effect of result.effects) {
          if (effect.type === "node-ran-out") {
            ranOut.add(squareName(effect.square));
          } else if (effect.type === "site-went-active") {
            wentActive.add(squareName(effect.square));
          } else if (effect.type === "site-charged") {
            charged.add(squareName(effect.square));
          }
        }
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }

      // Every node the deal charged eventually drains and goes dormant —
      // nothing sits at its dealt drain forever.
      for (const name of dealtChargedNames) {
        expect(ranOut.has(name)).toBe(true);
      }
      // At least one dormant site recovers to active over the run.
      expect(wentActive.size).toBeGreaterThan(0);
      // Every one of the seventeen sites is charged at least once, whatever
      // pressure the deal opened it at.
      expect(charged.size).toBe(SITES.length);
      // The board is back at its target count by the end of the run.
      const finalCharged = SITES.filter(
        (square) => siteStateAt(state, square) === "charged",
      ).length;
      expect(finalCharged).toBe(TARGET_CHARGED_SITES);
    },
  );
});

const PRESSURE_FAVOURS_TRIALS = 3_000;
/**
 * The higher-pressure half of the pool should be drawn far more often than
 * the lower half; a prototype of this deal measured about 0.83 across 5,000
 * trials, so this leaves generous margin above an even 0.5 split.
 */
const MINIMUM_HIGHER_HALF_SHARE = 0.65;

describe("the first charge draw of a game favours the sites dealt the most pressure (rules.md §8.1, §8.2)", () => {
  it("draws from the higher-pressure half of the pool far more often than the lower half, and still sometimes draws a site dealt pressure 1", () => {
    let seed = 20260901;
    let higherHalfDraws = 0;
    let sawPressureOneDraw = false;

    for (let trial = 0; trial < PRESSURE_FAVOURS_TRIALS; trial++) {
      const [dealt, dealtSeed] = dealOpeningBoard(seed);

      // Make room for one draw: the first dealt charged site goes dormant
      // instead, leaving four charged and the usual twelve active sites to
      // draw from — `runChargeDraw` then draws exactly once.
      const chargedName = SITES.map(squareName).find(
        (name) => dealt[name].state === "charged",
      );
      if (chargedName === undefined) {
        throw new Error("a deal with no charged site cannot happen");
      }

      const state: GameState = {
        ships: [],
        siteStates: {
          ...dealt,
          [chargedName]: { state: "dormant", level: NODE_CAPACITY },
        },
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: dealtSeed,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };

      const activeNames = SITES.map(squareName).filter(
        (name) => state.siteStates[name].state === "active",
      );
      const sortedByPressure = [...activeNames].sort(
        (a, b) => state.siteStates[a].level - state.siteStates[b].level,
      );
      const upperHalfNames = new Set(
        sortedByPressure.slice(Math.floor(sortedByPressure.length / 2)),
      );

      const { state: afterDraw, effects } = runChargeDraw(state);
      seed = afterDraw.randomSeed;

      expect(effects).toHaveLength(1);
      const drawnName = squareName(effects[0].square);
      const drawnPressure = state.siteStates[drawnName].level;

      if (upperHalfNames.has(drawnName)) {
        higherHalfDraws += 1;
      }
      if (drawnPressure === 1) {
        sawPressureOneDraw = true;
      }
    }

    expect(higherHalfDraws / PRESSURE_FAVOURS_TRIALS).toBeGreaterThan(
      MINIMUM_HIGHER_HALF_SHARE,
    );
    expect(sawPressureOneDraw).toBe(true);
  });
});

/** A minimal state with a single charged node at H8 and nothing else, so nothing but its own drain draw can affect when it runs out. */
function singleChargedNodeState(seed: number, level: number): GameState {
  return {
    ships: [],
    siteStates: { H8: { state: "charged", level } },
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: seed,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

/** The ply H8 first runs out on, running empty end-of-turns from `level` with no ship anywhere. */
function firstRunOutPly(seed: number, level: number): number {
  let state = singleChargedNodeState(seed, level);

  for (let ply = 1; ply <= 200; ply++) {
    const result = runEndOfTurn(state);
    for (const effect of result.effects) {
      if (
        effect.type === "node-ran-out" &&
        squareName(effect.square) === "H8"
      ) {
        return ply;
      }
    }
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  throw new Error("H8 never ran out within 200 plies — likely a regression");
}

const RUN_OUT_SEEDS = Array.from({ length: 30 }, (_, index) => 4102000 + index);

describe("a node dealt deep into its life runs out sooner than one dealt fresh (rules.md §8.1, §8.3)", () => {
  it("runs out in about 10 plies from drain 40, and about 29 from drain 0", () => {
    const pliesFromZero = RUN_OUT_SEEDS.map((seed) => firstRunOutPly(seed, 0));
    const pliesFromForty = RUN_OUT_SEEDS.map((seed) =>
      firstRunOutPly(seed, 40),
    );

    const average = (values: readonly number[]): number =>
      values.reduce((total, value) => total + value, 0) / values.length;

    const averageFromZero = average(pliesFromZero);
    const averageFromForty = average(pliesFromForty);

    // The empty-node drain table averages 2.1 a turn, so a node with 60 to
    // burn averages about 29 plies and one with 20 left averages about 10 —
    // generous bounds around those, not a target to tune to.
    expect(averageFromZero).toBeGreaterThan(20);
    expect(averageFromZero).toBeLessThan(40);
    expect(averageFromForty).toBeGreaterThan(5);
    expect(averageFromForty).toBeLessThan(18);
    expect(averageFromForty).toBeLessThan(averageFromZero);
  });
});
