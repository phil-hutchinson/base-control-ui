// An integration test of the node economy over a long run, with no ship
// activity to interfere (rules.md Appendix B). This file is deliberately
// thin for now: the pre-0.26 version of it measured a twelve-node board's
// long-run shape in detail, and almost none of that survives the queue —
// the inactive count is no longer a statistic to measure, it is an
// invariant the code now guarantees outright. What remains here is what
// Step 4 of the story that introduced the queue could assert without first
// measuring a new economy: that the invariant actually holds over a long
// run, and that expiries stay spread out rather than arriving in clumps, a
// fact unrelated to the queue. The full long-run guard, including the
// direct fourth placement's effect on the shape of things, is rebuilt once
// that placement exists.

import { describe, expect, it } from "vitest";
import { squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import { nodeSquares, nodeStateAt, startingGameState } from "./gameState";
import { INACTIVE_NODE_COUNT } from "./nodeQueue";
import { TARGET_CHARGED_NODES } from "./nodes";

/** A generous game length: this test drives `runEndOfTurn` directly and never consults `isGameOver`. */
const NOMINAL_LENGTH_IN_ROUNDS = 1_000;
const PLIES_TO_RUN = 500;

const SEEDS = [20260819, 20260820, 20260821, 20260822, 20260823];

/**
 * How often two or more nodes are allowed to run out on the same turn, as a
 * share of turns played. Measured over `SEEDS` this sits at or under 1.4%;
 * the bound below leaves generous margin above that. Unaffected by the
 * queue — the drain and depletion clocks this measures are untouched by
 * this story.
 */
const MAXIMUM_MULTI_EXPIRY_SHARE = 0.1;

/**
 * No turn should run out all four charged nodes at once. Derived from
 * `TARGET_CHARGED_NODES` so it follows that number if it ever changes.
 */
const MAXIMUM_EXPIRIES_IN_ONE_PLY = TARGET_CHARGED_NODES - 1;

interface EconomySample {
  readonly inactivePriorities: readonly number[];
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
    const inactiveSquares = nodeSquares(result.state).filter(
      (square) => nodeStateAt(result.state, square) === "inactive",
    );
    samples.push({
      inactivePriorities: inactiveSquares.map(
        (square) => result.state.nodes[squareName(square)].level,
      ),
      nodesRanOutThisPly: result.effects.filter(
        (effect) => effect.type === "node-ran-out",
      ).length,
    });
    state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
  }

  return samples;
}

describe("the long-run node economy (Appendix B)", () => {
  it.each(SEEDS)(
    "holds exactly three inactive nodes at every turn, holding priorities {1, 2, 3} (seed %d)",
    (seed) => {
      const samples = runEconomy(seed, PLIES_TO_RUN);

      samples.forEach((sample, i) => {
        expect(sample.inactivePriorities, `ply ${i}`).toHaveLength(
          INACTIVE_NODE_COUNT,
        );
        expect([...sample.inactivePriorities].sort(), `ply ${i}`).toEqual([
          1, 2, 3,
        ]);
      });
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
});
