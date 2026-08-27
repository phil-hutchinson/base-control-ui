// An integration test: plays whole games through the public rules API and
// proves the property the seeded generator design exists for — the same
// opening seed and the same sequence of actions produce the same game,
// fights and bay draws included, and a different seed produces a different
// one. The action policy below is deterministic, local to this file, and
// draws no randomness of its own: it attacks before it moves, so it produces
// plenty of fights, unlike `fullGame.test.ts`'s greedy policy, which only
// attacks when no ship has a legal move at all.

import { describe, expect, it } from "vitest";
import { type Square, squareName } from "./board";
import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, startingGameState } from "./gameState";
import { legalDestinations } from "./movement";
import { applyAttack, applyMove, applyPassGuard } from "./ply";

type Action =
  | {
      readonly kind: "attack";
      readonly shipId: ShipId;
      readonly target: Square;
    }
  | {
      readonly kind: "move";
      readonly shipId: ShipId;
      readonly destination: Square;
    };

/**
 * An attack-first policy: the first ship, in fleet order, with a legal
 * attack takes it; failing that, the first ship with a legal move takes it;
 * failing that, there is nothing to do and the pass guard handles it.
 */
function chooseAction(state: GameState): Action | undefined {
  for (const ship of state.ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length > 0) {
      return { kind: "move", shipId: ship.id, destination: destinations[0] };
    }
  }

  return undefined;
}

/** A hard ceiling on actions applied, so a regression fails an assertion, not the test runner. */
const MAX_ACTIONS = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly bayReturns: readonly string[];
}

/**
 * Plays a whole game from `seed` at `lengthInRounds` using the attack-first
 * policy above, and records the square name of every bay a `fight-resolved`
 * effect returned a ship to, in the order the fights happened.
 */
function playSeededGame(seed: number, lengthInRounds: number): PlayedGame {
  let state = startingGameState(seed, lengthInRounds);
  const bayReturns: string[] = [];

  let actionsApplied = 0;
  while (!isGameOver(state)) {
    if (actionsApplied >= MAX_ACTIONS) {
      throw new Error(
        `seeded replay game exceeded ${MAX_ACTIONS} actions without ending — likely a regression`,
      );
    }
    actionsApplied += 1;

    const action = chooseAction(state);

    if (action === undefined) {
      const { state: nextState } = applyPassGuard(state);
      state = nextState;
      continue;
    }

    if (action.kind === "attack") {
      const result = applyAttack(state, action.shipId, action.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${action.shipId} on ${squareName(action.target)}`,
        );
      }
      state = result.state;
      for (const effect of result.effects) {
        if (effect.type === "fight-resolved") {
          for (const fightReturn of effect.returns) {
            bayReturns.push(squareName(fightReturn.to));
          }
        }
      }
    } else {
      const result = applyMove(state, action.shipId, action.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${action.shipId} to ${squareName(action.destination)}`,
        );
      }
      state = result.state;
    }
  }

  return { finalState: state, bayReturns };
}

describe("a seeded game replays its fights and its bays exactly", () => {
  it("produces plenty of fights over a forty-round game — the run is not vacuous", () => {
    const { bayReturns } = playSeededGame(20260819, 40);

    expect(bayReturns.length).toBeGreaterThanOrEqual(10);
  });

  it("replays the same bay sequence and the same final state from the same seed", () => {
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260819, 40);

    expect(second.bayReturns).toEqual(first.bayReturns);
    expect(second.finalState).toEqual(first.finalState);
  });

  it("produces a different bay sequence from a different seed", () => {
    // Any pair of distinct seeds is expected to diverge; these two are
    // confirmed to by running this test. If a future change to the game
    // happens to make this pair coincide, pick another pair.
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260820, 40);

    expect(second.bayReturns).not.toEqual(first.bayReturns);
  });
});
