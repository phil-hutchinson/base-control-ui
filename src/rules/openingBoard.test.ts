// Integration cover for a game that opens from a dealt board (rules.md
// §8.1), rather than for a single deal. `nodes.test.ts`'s "dealing the
// opening board" block already checks a deal's own shape and distributions
// in isolation; this file checks the properties that only show up once a
// dealt board is actually played from: the economy still runs to
// completion from wherever the deal put it, the first charge of the game
// charges exactly the priority-3 node, and a node dealt deep into its life
// runs out sooner than one dealt fresh.

import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runCharging } from "./charging";
import { runEndOfTurn } from "./endOfTurn";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  type GameState,
  nodeSquares,
  nodeStateAt,
  startingGameState,
} from "./gameState";
import { TOP_NODE_PRIORITY } from "./nodeQueue";
import { NODE_CAPACITY, TARGET_CHARGED_NODES, dealOpeningBoard } from "./nodes";

const FLEET_SQUARES = startingFleet(DEFAULT_FLEET_SIZE).map(
  (entry) => entry.square,
);

const RUN_TO_COMPLETION_SEEDS = [70210001, 70210002, 70210003];
const RUN_TO_COMPLETION_PLIES = 500;
const RUN_TO_COMPLETION_LENGTH_IN_ROUNDS = 1_000;

describe("a game played from a dealt board runs to completion (rules.md §8.1, §8.6)", () => {
  it.each(RUN_TO_COMPLETION_SEEDS)(
    "runs every dealt node out, retires depleted nodes, tops the board back up to four, and charges at least one of the dealt-inactive nodes (seed %d)",
    (seed) => {
      let state = startingGameState(seed, RUN_TO_COMPLETION_LENGTH_IN_ROUNDS);

      const dealtNodeNames = nodeSquares(state).map(squareName);
      const dealtChargedNames = dealtNodeNames.filter(
        (name) => state.nodes[name]?.state === "charged",
      );
      expect(dealtChargedNames).toHaveLength(TARGET_CHARGED_NODES);
      const dealtInactiveNames = dealtNodeNames.filter(
        (name) => !dealtChargedNames.includes(name),
      );

      const ranOut = new Set<string>();
      const retired = new Set<string>();
      const charged = new Set<string>();

      for (let ply = 0; ply < RUN_TO_COMPLETION_PLIES; ply++) {
        const result = runEndOfTurn(state);
        for (const effect of result.effects) {
          if (effect.type === "node-ran-out") {
            ranOut.add(squareName(effect.square));
          } else if (effect.type === "node-retired") {
            retired.add(squareName(effect.square));
          } else if (effect.type === "node-charged") {
            charged.add(squareName(effect.square));
          }
        }
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }

      // Every node the deal charged eventually drains and goes depleted —
      // nothing sits at its dealt drain forever.
      for (const name of dealtChargedNames) {
        expect(ranOut.has(name)).toBe(true);
      }
      // At least one depleted node retires over the run.
      expect(retired.size).toBeGreaterThan(0);
      // At least one of the three dealt-inactive nodes earns a real
      // node-charged effect. Not necessarily all three: a charge sweeps the
      // whole queue (§8.2), so whichever of the three did not charge on the
      // turn the shortfall was filled are discarded, unused, rather than
      // waiting their own turn — a genuine change from the pre-0.26 charge
      // draw, which drew nodes one at a time without ever discarding one
      // unused.
      const dealtInactiveCharged = dealtInactiveNames.filter((name) =>
        charged.has(name),
      );
      expect(dealtInactiveCharged.length).toBeGreaterThan(0);
      // The queue charges a healthy number of distinct squares over the
      // run — measured at 45-51 across the three seeds above; the floor
      // here leaves generous margin below that.
      expect(charged.size).toBeGreaterThan(15);
      // The board is back at its target count by the end of the run.
      const finalCharged = nodeSquares(state).filter(
        (square) => nodeStateAt(state, square) === "charged",
      ).length;
      expect(finalCharged).toBe(TARGET_CHARGED_NODES);
    },
  );
});

describe("the first charge of a game charges the priority-3 node (rules.md §8.1, §8.2)", () => {
  it("charges exactly the priority-3 inactive node, deterministically, over many seeds", () => {
    let seed = 20260901;

    for (let trial = 0; trial < 1_000; trial++) {
      const [dealt, dealtSeed] = dealOpeningBoard(FLEET_SQUARES, seed);
      seed = dealtSeed;

      // Make room for one charge: the first dealt charged node goes
      // depleted instead, leaving a shortfall of one for `runCharging` to
      // fill.
      const chargedName = Object.keys(dealt).find(
        (name) => dealt[name].state === "charged",
      );
      if (chargedName === undefined) {
        throw new Error("a deal with no charged node cannot happen");
      }
      const priorityThreeName = Object.keys(dealt).find(
        (name) =>
          dealt[name].state === "inactive" &&
          dealt[name].level === TOP_NODE_PRIORITY,
      );
      if (priorityThreeName === undefined) {
        throw new Error("a deal always carries a priority-3 node");
      }

      const state: GameState = {
        ships: [],
        nodes: {
          ...dealt,
          [chargedName]: { state: "depleted", level: NODE_CAPACITY },
        },
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: seed,
        openingSeed: seed,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        outOfTime: { green: false, red: false },
      };

      const { effects } = runCharging(state);

      expect(effects).toEqual([
        { type: "node-charged", square: squareFromName(priorityThreeName) },
      ]);
    }
  });
});

/** A minimal state with a single charged node at H8 and nothing else, so nothing but its own drain draw can affect when it runs out. */
function singleChargedNodeState(seed: number, level: number): GameState {
  return {
    ships: [],
    nodes: { H8: { state: "charged", level } },
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: seed,
    openingSeed: seed,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
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
