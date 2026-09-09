// Integration cover for a game that opens from a dealt board (rules.md
// §8.1), rather than for a single deal. `nodes.test.ts`'s "dealing the
// opening board" block already checks a deal's own shape and distributions
// in isolation; this file checks the properties that only show up once a
// dealt board is actually played from: the economy still runs to
// completion from wherever the deal put it, and the first charge of the
// game charges exactly the priority-3 node.
//
// A dealt board's four charged nodes carry no countdown (rules.md §8.1,
// §8.3) and never change on their own, so "runs to completion" needs a
// stand-in for a ship stepping onto one: at the start of each ply, at most
// one charged node with no countdown already running is given one. At most
// **one** matters, mirroring "at most one countdown starts per turn"
// (rules.md §8.3) — it is what keeps expiries staggered rather than piling
// up together. This is a driver standing in for play, not a claim about
// what a real game does.

import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runCharging } from "./charging";
import { CHARGED_COUNTDOWN_PLIES } from "./countdown";
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
import { TARGET_CHARGED_NODES, dealOpeningBoard } from "./nodes";

const FLEET_SQUARES = startingFleet(DEFAULT_FLEET_SIZE).map(
  (entry) => entry.square,
);

/**
 * Gives a countdown to the first charged node with none, in board order, if
 * any — the driver this file's header describes. Returns `state` unchanged
 * if every charged node already has one running (or there are none).
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

const RUN_TO_COMPLETION_SEEDS = [70210001, 70210002, 70210003];
const RUN_TO_COMPLETION_PLIES = 500;
const RUN_TO_COMPLETION_LENGTH_IN_ROUNDS = 1_000;

describe("a game played from a dealt board runs to completion (rules.md §8.1, §8.6)", () => {
  it.each(RUN_TO_COMPLETION_SEEDS)(
    "runs every dealt node out, retires depleted nodes, tops the board back up to four, and charges at least one of the dealt-inactive nodes (seed %d)",
    (seed) => {
      let state = startingGameState(seed, {
        lengthInRounds: RUN_TO_COMPLETION_LENGTH_IN_ROUNDS,
      });

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
        state = startOneCountdown(state);
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

      // Every node the deal charged eventually runs out — nothing sits at
      // baseline forever once the driver has reached it.
      for (const name of dealtChargedNames) {
        expect(ranOut.has(name)).toBe(true);
      }
      // At least one depleted node retires over the run.
      expect(retired.size).toBeGreaterThan(0);
      // At least one of the three dealt-inactive nodes earns a real
      // node-charged effect. Not necessarily all three: a charge sweeps the
      // whole queue (§8.2), so whichever of the three did not charge on the
      // turn the shortfall was filled are discarded, unused, rather than
      // waiting their own turn.
      const dealtInactiveCharged = dealtInactiveNames.filter((name) =>
        charged.has(name),
      );
      expect(dealtInactiveCharged.length).toBeGreaterThan(0);
      // The queue charges a healthy number of distinct squares over the run.
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
          [chargedName]: { state: "depleted", level: 1 },
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
