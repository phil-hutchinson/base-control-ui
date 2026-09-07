// An integration test: plays whole games through the public rules API and
// proves the property the seeded generator design exists for — the same
// opening seed and the same sequence of actions produce the same game,
// fights and planet draws included, and a different seed produces a different
// one. The action policy below is deterministic, local to this file, and
// draws no randomness of its own: it attacks before it moves, so it produces
// plenty of fights, unlike `fullGame.test.ts`'s greedy policy, which only
// attacks when no ship has a legal move at all.
//
// The board's own end-of-turn charge draw (§8.2) is a consumer of the seeded
// stream too, alongside planet returns, so the same property is proven for it:
// the sequence of nodes the draw charges over a game replays identically
// from the same seed. Since 0.12 the stream's bulk is neither of those —
// every charged node's drain and every depleted node's recovery are drawn
// every turn (§8.3, §8.2), so a ply now consumes several times as many seed
// steps as it did under 0.11. Those per-node draws are not tracked
// separately here; they are exercised indirectly, and their effect on the
// final state is what the whole-state equality check below proves replays.
//
// Since 0.18 the stream starts even earlier than green's first turn: the
// opening board itself is dealt from the same seed (`dealOpeningBoard`,
// §8.1). Since 0.20 that deal draws each node's square rather than filling a
// fixed list, consuming 24 steps — twelve square draws and twelve level
// draws — before a single ply is played. `startingGameState` is what a
// recorded game would call to reproduce that deal, so the property under
// test now covers it too: the same seed deals the same opening board, and a
// different seed deals a different one.
//
// 0.26 replaces that charge draw with the queue (§8.2): charging itself
// draws nothing any more, but the queue's own refill — drawing three new
// inactive nodes, spread apart by a distance weighting, whenever a charge
// sweeps the surviving ones — is now the stream's biggest consumer. The
// sequence of `queue-refilled` effects a game produces — the squares
// discarded and the trio drawn to replace them, in order — is recorded and
// compared below, for the same reason: it is drawn from the same stream, and
// a recorded game must replay it exactly too. A retiring node's own square
// (`node-retired`) is recorded alongside it, though retirement itself draws
// nothing since 0.26 — nothing appears in a retiring node's place any more.

import { describe, expect, it } from "vitest";
import { type Square, squareName } from "./board";
import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, startingGameState } from "./gameState";
import { legalDestinations } from "./movement";
import {
  type AttackEffect,
  type EndOfActionEffect,
  type MoveEffect,
  applyAttack,
  applyMove,
  applyPassGuard,
} from "./ply";

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

/** The square name of every `node-charged` effect nested inside an end-of-action effect, if any. */
function chargedSquares(
  effects: readonly (MoveEffect | AttackEffect | EndOfActionEffect)[],
): readonly string[] {
  const squares: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "node-charged") {
          squares.push(squareName(sub.square));
        }
      }
    }
  }
  return squares;
}

/** The square name of every `node-retired` effect nested inside an end-of-action effect, if any. */
function retiredNodes(
  effects: readonly (MoveEffect | AttackEffect | EndOfActionEffect)[],
): readonly string[] {
  const squares: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "node-retired") {
          squares.push(squareName(sub.square));
        }
      }
    }
  }
  return squares;
}

/**
 * Every `queue-refilled` effect nested inside an end-of-action effect, if
 * any, as one string per sweep: the discarded squares, then the trio drawn
 * to replace them with the priority each was dealt, e.g.
 * `"D8,K5=>F3:2,H9:3,C11:1"`.
 */
function queueRefills(
  effects: readonly (MoveEffect | AttackEffect | EndOfActionEffect)[],
): readonly string[] {
  const refills: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "queue-refilled") {
          const discarded = sub.discardedSquares.map(squareName).join(",");
          const drawn = sub.newNodes
            .map((node) => `${squareName(node.square)}:${node.priority}`)
            .join(",");
          refills.push(`${discarded}=>${drawn}`);
        }
      }
    }
  }
  return refills;
}

/** A hard ceiling on actions applied, so a regression fails an assertion, not the test runner. */
const MAX_ACTIONS = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly openingBoard: Readonly<Record<string, GameState["nodes"][string]>>;
  readonly planetReturns: readonly string[];
  readonly chargedNodes: readonly string[];
  readonly retiredNodes: readonly string[];
  readonly queueRefills: readonly string[];
  readonly fightCount: number;
}

/**
 * Plays a whole game from `seed` at `lengthInRounds` using the attack-first
 * policy above, and records the opening board the seed dealt (§8.1) before
 * play began, the square name of every planet a `fight-resolved` effect
 * returned a ship to, in the order the fights happened, how many fights
 * happened, the square name of every node the queue charged, in the order it
 * charged them, the square name of every node the end-of-turn sequence
 * retired, in order, and every sweep the queue's refill produced, in order
 * (§3.2, §8.2).
 */
function playSeededGame(seed: number, lengthInRounds: number): PlayedGame {
  let state = startingGameState(seed, lengthInRounds);
  const openingBoard = state.nodes;
  const planetReturns: string[] = [];
  const chargedNodes: string[] = [];
  const retiredNodeSquares: string[] = [];
  const queueRefillSweeps: string[] = [];
  let fightCount = 0;

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
      const { state: nextState, effect } = applyPassGuard(state);
      state = nextState;
      if (effect !== undefined) {
        chargedNodes.push(...chargedSquares([effect]));
        retiredNodeSquares.push(...retiredNodes([effect]));
        queueRefillSweeps.push(...queueRefills([effect]));
      }
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
          fightCount += 1;
          for (const fightReturn of effect.returns) {
            planetReturns.push(squareName(fightReturn.to));
          }
        }
      }
      chargedNodes.push(...chargedSquares(result.effects));
      retiredNodeSquares.push(...retiredNodes(result.effects));
      queueRefillSweeps.push(...queueRefills(result.effects));
    } else {
      const result = applyMove(state, action.shipId, action.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${action.shipId} to ${squareName(action.destination)}`,
        );
      }
      state = result.state;
      chargedNodes.push(...chargedSquares(result.effects));
      retiredNodeSquares.push(...retiredNodes(result.effects));
      queueRefillSweeps.push(...queueRefills(result.effects));
    }
  }

  return {
    finalState: state,
    openingBoard,
    planetReturns,
    chargedNodes,
    retiredNodes: retiredNodeSquares,
    queueRefills: queueRefillSweeps,
    fightCount,
  };
}

/** Every node's `level` at the end of a game, keyed by square name — the part of the state the drain and recovery draws write to. */
function nodeLevels(state: GameState): Readonly<Record<string, number>> {
  const levels: Record<string, number> = {};
  for (const [name, status] of Object.entries(state.nodes)) {
    levels[name] = status.level;
  }
  return levels;
}

describe("a seeded game replays its opening board, its fights, its planets, its charges and its queue refills exactly", () => {
  it("produces plenty of fights, charges and queue refills, over a forty-round game — the run is not vacuous", () => {
    const {
      planetReturns,
      chargedNodes,
      retiredNodes,
      queueRefills,
      fightCount,
    } = playSeededGame(20260819, 40);

    // Ships start on ordinary edge squares and are attackable from the
    // first turn — a ship only becomes unattackable by flying onto a
    // planet, away from the board's outer edge — so this attack-first
    // policy keeps finding fights across the run rather than stalling
    // early. Re-measured at 3 fights (6 planet returns) for this seed over
    // forty rounds since §6's move table shrank to two shapes' worth of
    // reach (0.24); the floors below leave margin below that.
    expect(fightCount).toBeGreaterThanOrEqual(2);
    expect(planetReturns.length).toBeGreaterThanOrEqual(4);
    // Re-measured at 10 charges, 8 retirements and 9 refills for this seed
    // over forty rounds (0.26); the floors below leave margin below that.
    expect(chargedNodes.length).toBeGreaterThanOrEqual(7);
    expect(retiredNodes.length).toBeGreaterThanOrEqual(6);
    expect(queueRefills.length).toBeGreaterThanOrEqual(6);
  });

  it("replays the same opening board, the same planet sequence, the same charged-node sequence, the same retirement and refill sequences and the same final state from the same seed", () => {
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260819, 40);

    expect(second.openingBoard).toEqual(first.openingBoard);
    expect(second.planetReturns).toEqual(first.planetReturns);
    expect(second.chargedNodes).toEqual(first.chargedNodes);
    expect(second.retiredNodes).toEqual(first.retiredNodes);
    expect(second.queueRefills).toEqual(first.queueRefills);
    expect(second.finalState).toEqual(first.finalState);
    // The final state's equality above already covers this, but it is
    // worth naming directly: the drain and recovery draws that now
    // dominate the seeded stream (§8.2, §8.3) write to every node's
    // `level`, not only to which nodes get charged.
    expect(nodeLevels(second.finalState)).toEqual(nodeLevels(first.finalState));
  });

  it("deals a different opening board, and produces a different planet sequence, a different charged-node sequence and a different refill sequence, from a different seed", () => {
    // Any pair of distinct seeds is expected to diverge; these two are
    // confirmed to by running this test. If a future change to the game
    // happens to make this pair coincide, pick another pair.
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260820, 40);

    expect(second.openingBoard).not.toEqual(first.openingBoard);
    expect(second.planetReturns).not.toEqual(first.planetReturns);
    expect(second.chargedNodes).not.toEqual(first.chargedNodes);
    expect(second.queueRefills).not.toEqual(first.queueRefills);
  });
});
