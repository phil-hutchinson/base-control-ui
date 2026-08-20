// An integration test: plays a whole game through the public rules API and
// proves the collection (§8.4), the round arithmetic (§9) and the ending
// work together as one. The action policy below is deterministic and lives
// only in this file — the rules layer implements the rules, not how to play
// them — and draws no randomness of its own, so it never perturbs §8.6's
// seeded replacement draws.

import { describe, expect, it } from "vitest";
import { COLUMN_LETTERS, type Square, squareName } from "./board";
import { legalTargets, sevenOnlyLegalTargets } from "./combat";
import type { ShipId } from "./fleet";
import { gameResult, isGameOver, pliesForGameLength } from "./gameLength";
import { type GameState, siteStateAt, startingGameState } from "./gameState";
import type { EnergyCollectedEffect } from "./endOfTurn";
import { sixOnlyLegalDestinations } from "./moveLegality";
import { legalDestinations } from "./movement";
import {
  type AttackEffect,
  type MoveEffect,
  type PassEffect,
  applyAttack,
  applyMove,
  applyPassGuard,
} from "./ply";
import { SITES } from "./sites";

type Action =
  | {
      readonly kind: "move";
      readonly shipId: ShipId;
      readonly destination: Square;
    }
  | {
      readonly kind: "attack";
      readonly shipId: ShipId;
      readonly target: Square;
    };

/** Chebyshev distance between two squares — the metric §6's reach table is built on. */
function chebyshevDistance(a: Square, b: Square): number {
  const columnDelta = Math.abs(
    COLUMN_LETTERS.indexOf(a.column) - COLUMN_LETTERS.indexOf(b.column),
  );
  const rowDelta = Math.abs(a.row - b.row);
  return Math.max(columnDelta, rowDelta);
}

/** The distance from `square` to the nearest charged or active site right now. */
function distanceToNearestChargedOrActive(
  state: GameState,
  square: Square,
): number {
  let nearest = Infinity;
  for (const site of SITES) {
    const siteState = siteStateAt(state, site);
    if (siteState !== "charged" && siteState !== "active") {
      continue;
    }
    const distance = chebyshevDistance(square, site);
    if (distance < nearest) {
      nearest = distance;
    }
  }
  return nearest;
}

/**
 * A deterministic greedy policy: head for a charged node first, otherwise
 * close the distance to the nearest charged or active site, otherwise
 * attack, otherwise pass. Evaluated fresh for every action.
 */
function chooseAction(state: GameState): Action | undefined {
  const ships = state.ships;

  // 1. The first destination, in fleet-then-destination order, that is
  // itself a charged node.
  for (const ship of ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (siteStateAt(state, destination) === "charged") {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  // 2. Otherwise, the move that most reduces the distance to the nearest
  // charged or active site, ties broken by the same enumeration order.
  let best:
    { shipId: ShipId; destination: Square; improvement: number } | undefined;
  for (const ship of ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length === 0) {
      continue;
    }
    const fromDistance = distanceToNearestChargedOrActive(state, ship.square);
    for (const destination of destinations) {
      const toDistance = distanceToNearestChargedOrActive(state, destination);
      const improvement = fromDistance - toDistance;
      if (best === undefined || improvement > best.improvement) {
        best = { shipId: ship.id, destination, improvement };
      }
    }
  }
  if (best !== undefined) {
    return { kind: "move", shipId: best.shipId, destination: best.destination };
  }

  // 3. Otherwise, if no ship has a legal move at all, the first legal
  // attack in ship-then-target order.
  for (const ship of ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  // 4. Otherwise there is nothing to do; the pass guard handles it.
  return undefined;
}

/** The `energy-collected` effects nested inside a ply's end-of-turn effects, if any. */
function energyCollectedEffects(
  effects: readonly (MoveEffect | AttackEffect)[] | readonly [PassEffect],
): readonly EnergyCollectedEffect[] {
  const collected: EnergyCollectedEffect[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "energy-collected") {
          collected.push(sub);
        }
      }
    }
  }
  return collected;
}

/** A hard ceiling on actions applied, so a regression hangs the assertion, not the test runner. */
const MAX_ACTIONS = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly greenCollected: readonly EnergyCollectedEffect[];
  readonly redCollected: readonly EnergyCollectedEffect[];
}

/** Plays a whole game from `seed` at `lengthInRounds` using the greedy policy above. */
function playFullGame(seed: number, lengthInRounds: number): PlayedGame {
  let state = startingGameState(seed, lengthInRounds);
  const greenCollected: EnergyCollectedEffect[] = [];
  const redCollected: EnergyCollectedEffect[] = [];

  let actionsApplied = 0;
  while (!isGameOver(state)) {
    if (actionsApplied >= MAX_ACTIONS) {
      throw new Error(
        `full game exceeded ${MAX_ACTIONS} actions without ending — likely a regression`,
      );
    }
    actionsApplied += 1;

    const action = chooseAction(state);
    let effects: readonly (MoveEffect | AttackEffect)[];

    if (action === undefined) {
      const { state: nextState, effect } = applyPassGuard(state);
      state = nextState;
      effects = effect === undefined ? [] : [effect];
    } else if (action.kind === "move") {
      const result = applyMove(state, action.shipId, action.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${action.shipId} to ${squareName(action.destination)}`,
        );
      }
      state = result.state;
      effects = result.effects;
    } else {
      const result = applyAttack(state, action.shipId, action.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${action.shipId} on ${squareName(action.target)}`,
        );
      }
      state = result.state;
      effects = result.effects;
    }

    for (const collected of energyCollectedEffects(effects)) {
      (collected.side === "green" ? greenCollected : redCollected).push(
        collected,
      );
    }
  }

  return { finalState: state, greenCollected, redCollected };
}

/**
 * A move that the six-only legality layer (game-over-unaware by design)
 * still calls legal on `state` — i.e. one that would have been legal a
 * moment earlier, before the game ended.
 */
function findMoveLegalAMomentEarlier(
  state: GameState,
): { shipId: ShipId; destination: Square } | undefined {
  for (const ship of state.ships) {
    const [destination] = sixOnlyLegalDestinations(state, ship.id);
    if (destination !== undefined) {
      return { shipId: ship.id, destination };
    }
  }
  return undefined;
}

/**
 * An attack that the seven-only legality layer (game-over-unaware by
 * design) still calls legal on `state` — i.e. one that would have been
 * legal a moment earlier, before the game ended.
 */
function findAttackLegalAMomentEarlier(
  state: GameState,
): { shipId: ShipId; target: Square } | undefined {
  for (const ship of state.ships) {
    const [target] = sevenOnlyLegalTargets(state, ship.id);
    if (target !== undefined) {
      return { shipId: ship.id, target };
    }
  }
  return undefined;
}

/**
 * Confirms `state` refuses a move, a pass and — when one is available — an
 * attack, all as `"game-over"`. Returns whether an attack legal a moment
 * earlier was found to refuse: under one action per turn, a short game may
 * end before any two ships come within reach of one another, so the caller
 * decides whether that absence is expected (rules.md §5, D5).
 */
function assertRefusesEverything(state: GameState): boolean {
  const move = findMoveLegalAMomentEarlier(state);
  if (move === undefined) {
    throw new Error("expected at least one move legal a moment earlier");
  }
  const moveAttempt = applyMove(state, move.shipId, move.destination);
  expect(moveAttempt.outcome).toBe("refused");
  if (moveAttempt.outcome === "refused") {
    expect(moveAttempt.reason).toBe("game-over");
  }

  const attack = findAttackLegalAMomentEarlier(state);
  const foundAttack = attack !== undefined;
  if (attack !== undefined) {
    const attackAttempt = applyAttack(state, attack.shipId, attack.target);
    expect(attackAttempt.outcome).toBe("refused");
    if (attackAttempt.outcome === "refused") {
      expect(attackAttempt.reason).toBe("game-over");
    }
  }

  const guarded = applyPassGuard(state);
  expect(guarded.state).toEqual(state);
  expect(guarded.effect).toBeUndefined();

  return foundAttack;
}

function sumAmounts(effects: readonly EnergyCollectedEffect[]): number {
  return effects.reduce((total, effect) => total + effect.amount, 0);
}

describe("a full game, end to end", () => {
  it("plays a hundred-round game to its end, with totals consistent throughout", () => {
    const seed = 20260819;
    const { finalState, greenCollected, redCollected } = playFullGame(
      seed,
      100,
    );

    expect(finalState.plyNumber).toBe(pliesForGameLength(100) + 1);
    expect(isGameOver(finalState)).toBe(true);

    expect(finalState.energy.green).toBe(sumAmounts(greenCollected));
    expect(finalState.energy.red).toBe(sumAmounts(redCollected));

    // The policy should actually score, not merely reach the end.
    expect(finalState.energy.green).toBeGreaterThan(0);
    expect(finalState.energy.red).toBeGreaterThan(0);

    const result = gameResult(finalState);
    if (finalState.energy.green > finalState.energy.red) {
      expect(result.outcome).toBe("green-won");
      expect(result.winner).toBe("green");
    } else if (finalState.energy.red > finalState.energy.green) {
      expect(result.outcome).toBe("red-won");
      expect(result.winner).toBe("red");
    } else {
      expect(result.outcome).toBe("draw");
      expect(result.winner).toBeUndefined();
    }
    expect(result.energy).toEqual(finalState.energy);

    // A hundred-round game is long enough that fights do happen; this is
    // where the game-over refusal of an attack is genuinely proven.
    expect(assertRefusesEverything(finalState)).toBe(true);
  });

  it("plays a three-round game to its end, by the same route", () => {
    const seed = 20260819;
    const { finalState, greenCollected, redCollected } = playFullGame(seed, 3);

    expect(finalState.plyNumber).toBe(pliesForGameLength(3) + 1);
    expect(isGameOver(finalState)).toBe(true);

    expect(finalState.energy.green).toBe(sumAmounts(greenCollected));
    expect(finalState.energy.red).toBe(sumAmounts(redCollected));

    const result = gameResult(finalState);
    if (finalState.energy.green > finalState.energy.red) {
      expect(result.outcome).toBe("green-won");
    } else if (finalState.energy.red > finalState.energy.green) {
      expect(result.outcome).toBe("red-won");
    } else {
      expect(result.outcome).toBe("draw");
    }
    expect(result.energy).toEqual(finalState.energy);

    // Under one action per turn, six actions never bring two ships within
    // reach of one another, so no attack is expected here (D5); the move
    // and pass refusals are still checked.
    assertRefusesEverything(finalState);
  });
});
