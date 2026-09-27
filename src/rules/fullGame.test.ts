// An integration test: plays a whole game through the public rules API and
// proves the collection (§8.4), the round arithmetic (§9) and the ending
// work together as one. The ply policy below is deterministic and lives
// only in this file — the rules layer implements the rules, not how to play
// them — and draws no randomness of its own, so it never perturbs the
// game's own seeded draws, including §8.2's queue refills.

import { describe, expect, it } from "vitest";
import {
  COLUMN_LETTERS,
  type Square,
  squareFromName,
  squareName,
} from "./board";
import { PLANETS, isPlanet } from "./planets";
import { legalTargets } from "./combat";
import { DEFAULT_FLEET_SIZE, type FleetSize, type ShipId } from "./fleet";
import { gameResult, isGameOver, pliesForGameLength } from "./gameLength";
import {
  type GameState,
  type Ship,
  type NodeStatus,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
  startingGameState,
} from "./gameState";
import { type EnergyCollectedEffect, runEndOfTurn } from "./endOfTurn";
import { legalDestinations } from "./movement";
import {
  CHARGED_NODE_COUNTS,
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
} from "./nodes";
import { NODE_PLAYSTYLES, type NodePlaystyle } from "./nodePlaystyle";
import type { PlanetBonusSetting } from "./planetBonus";
import {
  PLAYER_MATCHING_SETTINGS,
  type PlayerMatchingSetting,
} from "./playerMatching";
import { SCORING_SETTINGS, type ScoringSetting } from "./scoring";
import {
  NODE_SIGNALS,
  type NodeSignal,
  everyNodeHasExtra,
  squaresForSignal,
} from "./steal";
import {
  type AttackEffect,
  type MoveEffect,
  type PassEffect,
  applyAttack,
  applyMove,
  applyPassGuard,
} from "./ply";

type PlyChoice =
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

/**
 * The distance from `square` to the nearest charged or inactive node right
 * now, or, under steal, a prospective node too. Inactive means eligible to
 * charge next (rules.md §8.1, §8.2), so this heads for either a node a ship
 * can land on today or one that might become landable soon — never to land
 * on the inactive node itself, which a move may not do (rules.md §6), only
 * to be nearby when it charges. A prospective node (steal.md §2) is itself a
 * legal landing, and landing on one is the only way to claim or steal it, so
 * it is a target in its own right, not merely a place to be nearby. Heading
 * for a depleted node would be pointless, since it cannot be charged next;
 * under steal there is no depleted state at all.
 */
function distanceToNearestChargedOrInactive(
  state: GameState,
  square: Square,
): number {
  let nearest = Infinity;
  for (const node of nodeSquares(state)) {
    const nodeState = nodeStateAt(state, node);
    if (
      nodeState !== "charged" &&
      nodeState !== "inactive" &&
      nodeState !== "prospective"
    ) {
      continue;
    }
    const distance = chebyshevDistance(square, node);
    if (distance < nearest) {
      nearest = distance;
    }
  }
  return nearest;
}

/** Whether `square` is one of the two current advanced planet bonuses' planets (steal.md §10). */
function isAdvancedBonusPlanet(state: GameState, square: Square): boolean {
  return state.advancedBonuses.some(
    (bonus) => squareName(bonus.square) === squareName(square),
  );
}

/**
 * A deterministic greedy policy: under advanced, race for a bonus planet
 * first (steal.md §10) — otherwise head for a charged node, or, under
 * steal, a prospective node, since landing on one is the only way to claim
 * or steal it (steal.md §3) — otherwise close the distance to the nearest
 * charged-or-eligible-to-be-charged (or, under steal, prospective) node,
 * otherwise attack, otherwise pass. Evaluated fresh for every ply.
 */
function choosePly(state: GameState): PlyChoice | undefined {
  const ships = state.ships;

  // 0. Under advanced, the first destination, in fleet-then-destination
  // order, that lands on one of the two current bonus planets. Vacuous —
  // `state.advancedBonuses` is empty — under every other setting.
  for (const ship of ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (isAdvancedBonusPlanet(state, destination)) {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  // 1. The first destination, in fleet-then-destination order, that is
  // itself a charged node, or, under steal, a prospective one.
  for (const ship of ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      const destinationState = nodeStateAt(state, destination);
      if (
        destinationState === "charged" ||
        destinationState === "prospective"
      ) {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  // 2. Otherwise, the move that most reduces the distance to the nearest
  // charged or inactive node, ties broken by the same enumeration order.
  let best:
    { shipId: ShipId; destination: Square; improvement: number } | undefined;
  for (const ship of ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length === 0) {
      continue;
    }
    const fromDistance = distanceToNearestChargedOrInactive(state, ship.square);
    for (const destination of destinations) {
      const toDistance = distanceToNearestChargedOrInactive(state, destination);
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

/** A hard ceiling on plies applied, so a regression hangs the assertion, not the test runner. */
const MAX_PLIES = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly greenCollected: readonly EnergyCollectedEffect[];
  readonly redCollected: readonly EnergyCollectedEffect[];
  readonly attacksApplied: number;
}

interface PlayFullGameOptions {
  readonly fleetSize?: FleetSize;
  readonly chargedNodeCount?: ChargedNodeCount;
  readonly combatEnabled?: boolean;
  readonly scoring?: ScoringSetting;
  readonly nodePlaystyle?: NodePlaystyle;
  readonly planetBonus?: PlanetBonusSetting;
  readonly playerMatching?: PlayerMatchingSetting;
  /**
   * Called with the state after the opening deal and again after every ply,
   * so a caller can check an invariant throughout a game rather than only
   * at its end — the queue invariant (rules.md §8.2), for instance.
   */
  readonly onPly?: (state: GameState) => void;
  /**
   * Called with each ply's own effects (never the opening deal, which has
   * none), so a caller can tally what a game actually did — under steal, how
   * many `node-claimed` and `node-abandoned` effects it raised, for
   * instance.
   */
  readonly onEffects?: (
    effects: readonly (MoveEffect | AttackEffect)[],
  ) => void;
}

/**
 * Plays a whole game from `seed` at `lengthInRounds` using the greedy policy
 * above, dealt with `fleetSize` ships a side (the app's default five),
 * `chargedNodeCount` charged nodes (the app's default five), combat on
 * unless `combatEnabled` says otherwise, simple scoring unless `scoring`
 * says otherwise, and the continuous playstyle unless `nodePlaystyle` says
 * otherwise.
 */
function playFullGame(
  seed: number,
  lengthInRounds: number,
  {
    fleetSize = DEFAULT_FLEET_SIZE,
    chargedNodeCount = DEFAULT_CHARGED_NODE_COUNT,
    combatEnabled = true,
    scoring = "simple",
    nodePlaystyle = "continuous",
    planetBonus,
    playerMatching,
    onPly,
    onEffects,
  }: PlayFullGameOptions = {},
): PlayedGame {
  let state = startingGameState(seed, {
    lengthInRounds,
    fleetSize,
    chargedNodeCount,
    combatEnabled,
    scoring,
    nodePlaystyle,
    planetBonus,
    playerMatching,
  });
  onPly?.(state);
  const greenCollected: EnergyCollectedEffect[] = [];
  const redCollected: EnergyCollectedEffect[] = [];
  let attacksApplied = 0;

  let pliesApplied = 0;
  while (!isGameOver(state)) {
    if (pliesApplied >= MAX_PLIES) {
      throw new Error(
        `full game exceeded ${MAX_PLIES} plies without ending — likely a regression`,
      );
    }
    pliesApplied += 1;

    const choice = choosePly(state);
    let effects: readonly (MoveEffect | AttackEffect)[];

    if (choice === undefined) {
      const { state: nextState, effect } = applyPassGuard(state);
      state = nextState;
      effects = effect === undefined ? [] : [effect];
    } else if (choice.kind === "move") {
      const result = applyMove(state, choice.shipId, choice.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${choice.shipId} to ${squareName(choice.destination)}`,
        );
      }
      state = result.state;
      effects = result.effects;
    } else {
      const result = applyAttack(state, choice.shipId, choice.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${choice.shipId} on ${squareName(choice.target)}`,
        );
      }
      state = result.state;
      effects = result.effects;
      attacksApplied += 1;
    }

    onPly?.(state);
    onEffects?.(effects);

    for (const collected of energyCollectedEffects(effects)) {
      (collected.side === "green" ? greenCollected : redCollected).push(
        collected,
      );
    }
  }

  return {
    finalState: state,
    greenCollected,
    redCollected,
    attacksApplied,
  };
}

/**
 * A move legal against a copy of `state` whose game has not ended (its
 * `lengthInRounds` raised by one round) — i.e. one that would have been
 * legal a moment earlier, before the game ended. Used to prove the same
 * move is refused as `"game-over"` in the real, ended `state`.
 */
function findMoveLegalAMomentEarlier(
  state: GameState,
): { shipId: ShipId; destination: Square } | undefined {
  const notEnded: GameState = {
    ...state,
    lengthInRounds: state.lengthInRounds + 1,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
  };
  for (const ship of state.ships) {
    const [destination] = legalDestinations(notEnded, ship.id);
    if (destination !== undefined) {
      return { shipId: ship.id, destination };
    }
  }
  return undefined;
}

/**
 * An attack legal against a copy of `state` whose game has not ended (its
 * `lengthInRounds` raised by one round) — i.e. one that would have been
 * legal a moment earlier, before the game ended. Used to prove the same
 * attack is refused as `"game-over"` in the real, ended `state`.
 */
function findAttackLegalAMomentEarlier(
  state: GameState,
): { shipId: ShipId; target: Square } | undefined {
  const notEnded: GameState = {
    ...state,
    lengthInRounds: state.lengthInRounds + 1,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
  };
  for (const ship of state.ships) {
    const [target] = legalTargets(notEnded, ship.id);
    if (target !== undefined) {
      return { shipId: ship.id, target };
    }
  }
  return undefined;
}

/**
 * Confirms `state` refuses a move, a pass and — when one is available — an
 * attack, all as `"game-over"`. Returns whether an attack legal a moment
 * earlier was found to refuse: with only one move or attack a turn, a short
 * game may end before any two ships come within reach of one another, so the
 * caller decides whether that absence is expected (rules.md §5).
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

/**
 * The queue invariant (rules.md §8.2), unaffected by which node playstyle is
 * chosen: the board always carries exactly three inactive nodes, holding
 * priorities 1, 2 and 3 with no repeat.
 */
function assertQueueInvariant(state: GameState): void {
  const inactivePriorities = Object.values(state.nodes)
    .filter((status) => status.state === "inactive")
    .map((status) => status.level)
    .sort();
  expect(inactivePriorities).toEqual([1, 2, 3]);
}

/**
 * Under steal, a node is never inactive or depleted (steal.md §8): neither
 * state ever arises, whether or not a game's ships ever claim or abandon a
 * node.
 */
function assertNoInactiveOrDepletedNodes(state: GameState): void {
  for (const status of Object.values(state.nodes)) {
    expect(status.state).not.toBe("inactive");
    expect(status.state).not.toBe("depleted");
  }
}

/**
 * Every steal node invariant that must hold at any ply (steal.md §§2, 8):
 * each of the game's `chargedNodeCount` signals has exactly two squares,
 * charged and prospective or two prospective, never depleted or inactive; a
 * charged square never carries a countdown; and no rotator is ever laid
 * down.
 */
function assertStealNodeInvariants(
  state: GameState,
  chargedNodeCount: ChargedNodeCount,
): void {
  assertNoInactiveOrDepletedNodes(state);
  assertRotatorsAreFree(state);

  for (const signal of NODE_SIGNALS.slice(
    0,
    chargedNodeCount,
  ) as readonly NodeSignal[]) {
    const squares = squaresForSignal(state.nodes, signal);
    const statuses = squares.map((square) => nodeStatusAt(state, square));
    const extraCount = statuses.filter(
      (status) => status?.extra === true,
    ).length;
    // Two squares ordinarily; three when Additional nodes has given this
    // signal an extra (steal.md §10) — the advanced sweep below is what
    // exercises that case.
    expect(squares).toHaveLength(extraCount === 1 ? 3 : 2);
    expect(extraCount).toBeLessThanOrEqual(1);

    const chargedCount = statuses.filter(
      (status) => status?.state === "charged",
    ).length;
    expect(chargedCount).toBeLessThanOrEqual(1);

    for (const status of statuses) {
      expect(
        status?.state === "charged" || status?.state === "prospective",
      ).toBe(true);
      expect(status?.level).toBe(0);
      if (status?.extra === true) {
        expect(status.state).toBe("prospective");
      }
    }
  }
}

/**
 * Every advanced planet bonus invariant that must hold at any ply (steal.md
 * §10): exactly two bonuses stand, on two different planets, of two
 * different kinds, and neither planet carries a ship; and Additional nodes
 * never stands among them while every node already has its extra.
 */
function assertAdvancedBonusInvariants(
  state: GameState,
  chargedNodeCount: ChargedNodeCount,
): void {
  expect(state.advancedBonuses).toHaveLength(2);
  const [first, second] = state.advancedBonuses;
  expect(squareName(first.square)).not.toBe(squareName(second.square));
  expect(first.kind).not.toBe(second.kind);

  const shipSquareNames = new Set(
    state.ships.map((ship) => squareName(ship.square)),
  );
  for (const bonus of state.advancedBonuses) {
    expect(shipSquareNames.has(squareName(bonus.square))).toBe(false);
  }

  const additionalNodesStanding = state.advancedBonuses.some(
    (bonus) => bonus.kind === "additional-nodes",
  );
  if (additionalNodesStanding) {
    expect(everyNodeHasExtra(state.nodes, chargedNodeCount)).toBe(false);
  }
}

/**
 * A rotator never stands on a square that also carries a node, a planet or
 * a ship (rules.md §3.3). Harmless to call at any setting — `state.rotators`
 * is empty under continuous and planet, so the loop below never runs.
 */
function assertRotatorsAreFree(state: GameState): void {
  const shipSquareNames = new Set(
    state.ships.map((ship) => squareName(ship.square)),
  );
  for (const rotator of state.rotators) {
    expect(isPlanet(rotator)).toBe(false);
    expect(state.nodes[squareName(rotator)]).toBeUndefined();
    expect(shipSquareNames.has(squareName(rotator))).toBe(false);
  }
}

/** One ship, for building a state by hand rather than dealing it. */
function ship(id: ShipId, side: "green" | "red", square: string): Ship {
  return { id, side, square: squareFromName(square), power: 4 };
}

/**
 * A ship parked on every planet except those named in `emptyPlanetNames`, so
 * a return draw's pool (`drawReturnPlanet`, rules.md §7.1) is exactly those
 * planets.
 */
function shipsFillingPlanetsExcept(
  emptyPlanetNames: readonly string[],
): readonly Ship[] {
  return PLANETS.filter(
    (square) => !emptyPlanetNames.includes(squareName(square)),
  ).map((square, index) =>
    ship(`filler-${index}` as ShipId, "red", squareName(square)),
  );
}

describe.each(CHARGED_NODE_COUNTS)(
  "a full game, end to end, at %d charged nodes",
  (chargedNodeCount) => {
    it("plays a hundred-round game to its end, with totals consistent throughout", () => {
      const seed = 20260819;
      const { finalState, greenCollected, redCollected } = playFullGame(
        seed,
        100,
        { chargedNodeCount },
      );

      expect(finalState.plyNumber).toBe(pliesForGameLength(100) + 1);
      expect(isGameOver(finalState)).toBe(true);

      // Fixed for the game's lifetime (rules.md §8.1): whatever the deal
      // does to the board over a hundred rounds, the chosen count itself
      // never moves.
      expect(finalState.chargedNodeCount).toBe(chargedNodeCount);

      // The ledger holds exactly (§8.4, §8.6 step 2): a side's final total is
      // exactly what it collected for the charged nodes it held — nothing
      // subtracts energy any more, so there is no other side of the ledger to
      // net against.
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

      // Whether the played-out final position happens to leave two ships in
      // attack range is not something this test controls, so only the move
      // and pass refusals are relied on here; the attack refusal is asserted
      // separately below, against a state built to guarantee one.
      assertRefusesEverything(finalState);
    });

    it("plays a three-round game to its end, by the same route", () => {
      const seed = 20260819;
      const { finalState, greenCollected, redCollected } = playFullGame(
        seed,
        3,
        { chargedNodeCount },
      );

      expect(finalState.plyNumber).toBe(pliesForGameLength(3) + 1);
      expect(isGameOver(finalState)).toBe(true);
      expect(finalState.chargedNodeCount).toBe(chargedNodeCount);

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

      // With only one move or attack a turn, six turns never bring two ships
      // within reach of one another, so no attack is expected here; the move
      // and pass refusals are still checked.
      assertRefusesEverything(finalState);
    });
  },
);

describe("a full game, end to end, at bonus scoring (§8.4)", () => {
  it("collects at least as much as the same game at simple, and both sides' totals only ever rise, at either setting", () => {
    const seed = 20260819;
    const lengthInRounds = 100;

    const simpleGame = playFullGame(seed, lengthInRounds, {
      scoring: "simple",
    });
    const bonusGame = playFullGame(seed, lengthInRounds, {
      scoring: "bonus",
    });

    expect(bonusGame.finalState.energy.green).toBeGreaterThanOrEqual(
      simpleGame.finalState.energy.green,
    );
    expect(bonusGame.finalState.energy.red).toBeGreaterThanOrEqual(
      simpleGame.finalState.energy.red,
    );

    for (const game of [simpleGame, bonusGame]) {
      let greenRunningTotal = 0;
      let redRunningTotal = 0;
      for (const collected of game.greenCollected) {
        expect(collected.newTotal).toBeGreaterThan(greenRunningTotal);
        greenRunningTotal = collected.newTotal;
      }
      for (const collected of game.redCollected) {
        expect(collected.newTotal).toBeGreaterThan(redRunningTotal);
        redRunningTotal = collected.newTotal;
      }
    }
  });
});

describe.each(NODE_PLAYSTYLES)(
  "a full game, end to end, under %s (rules.md §8.2)",
  (nodePlaystyle) => {
    it("plays a three-round game to its end, with the queue invariant intact throughout", () => {
      const seed = 20260819;
      const { finalState } = playFullGame(seed, 3, {
        nodePlaystyle,
        onPly: (state) => {
          if (nodePlaystyle === "steal") {
            assertNoInactiveOrDepletedNodes(state);
          } else {
            assertQueueInvariant(state);
          }
          assertRotatorsAreFree(state);
        },
      });

      expect(finalState.nodePlaystyle).toBe(nodePlaystyle);
      expect(finalState.plyNumber).toBe(pliesForGameLength(3) + 1);
      expect(isGameOver(finalState)).toBe(true);
      if (nodePlaystyle === "steal") {
        assertNoInactiveOrDepletedNodes(finalState);
      } else {
        assertQueueInvariant(finalState);
      }
      assertRotatorsAreFree(finalState);
    });
  },
);

describe.each(CHARGED_NODE_COUNTS)(
  "a full steal game, end to end, at %d nodes (steal.md)",
  (chargedNodeCount) => {
    it.each([true, false])(
      "plays a hundred-round game to its end with combat enabled=%s, taking and losing nodes throughout",
      (combatEnabled) => {
        const seed = 20260819;
        let claims = 0;
        let steals = 0;
        let shipsTrapped = 0;

        const { finalState, greenCollected, redCollected } = playFullGame(
          seed,
          100,
          {
            chargedNodeCount,
            combatEnabled,
            nodePlaystyle: "steal",
            onPly: (state) =>
              assertStealNodeInvariants(state, chargedNodeCount),
            onEffects: (effects) => {
              for (const effect of effects) {
                if (effect.type === "node-claimed") {
                  claims += 1;
                  if (effect.releasedSquare !== undefined) {
                    steals += 1;
                  }
                } else if (
                  effect.type === "ply-ended" ||
                  effect.type === "ply-passed"
                ) {
                  shipsTrapped += effect.endOfTurn.filter(
                    (sub) => sub.type === "ship-trapped",
                  ).length;
                }
              }
            },
          },
        );

        expect(finalState.plyNumber).toBe(pliesForGameLength(100) + 1);
        expect(isGameOver(finalState)).toBe(true);
        assertStealNodeInvariants(finalState, chargedNodeCount);

        // Not vacuous: over a hundred rounds the greedy policy (which heads
        // for a prospective node whenever one is reachable) actually claims
        // and steals nodes, and no depleted state means no ship is ever
        // trapped (steal.md §8).
        expect(claims).toBeGreaterThan(0);
        expect(steals).toBeGreaterThan(0);
        expect(shipsTrapped).toBe(0);

        // A held node collects every turn and never depletes (steal.md §2),
        // so, exactly as at the other playstyles, each side's running total
        // only ever rises.
        let greenRunningTotal = 0;
        for (const collected of greenCollected) {
          expect(collected.newTotal).toBeGreaterThan(greenRunningTotal);
          greenRunningTotal = collected.newTotal;
        }
        let redRunningTotal = 0;
        for (const collected of redCollected) {
          expect(collected.newTotal).toBeGreaterThan(redRunningTotal);
          redRunningTotal = collected.newTotal;
        }
      },
    );
  },
);

describe.each(CHARGED_NODE_COUNTS)(
  "a full steal game under advanced planet bonuses, end to end, at %d nodes (steal.md §10)",
  (chargedNodeCount) => {
    it.each(
      PLAYER_MATCHING_SETTINGS.flatMap((playerMatching) =>
        SCORING_SETTINGS.flatMap((scoring) =>
          [true, false].map(
            (combatEnabled) =>
              [playerMatching, scoring, combatEnabled] as const,
          ),
        ),
      ),
    )(
      "keeps two distinct bonuses on two empty planets throughout, claiming at least one, with player-matching=%s, scoring=%s, combat enabled=%s",
      (playerMatching, scoring, combatEnabled) => {
        const seed = 20260819;
        let previousGreen = 0;
        let previousRed = 0;
        let claims = 0;

        const { finalState } = playFullGame(seed, 30, {
          chargedNodeCount,
          combatEnabled,
          scoring,
          nodePlaystyle: "steal",
          planetBonus: "advanced",
          playerMatching,
          onPly: (state) => {
            assertStealNodeInvariants(state, chargedNodeCount);
            assertAdvancedBonusInvariants(state, chargedNodeCount);
            expect(state.energy.green).toBeGreaterThanOrEqual(previousGreen);
            expect(state.energy.red).toBeGreaterThanOrEqual(previousRed);
            previousGreen = state.energy.green;
            previousRed = state.energy.red;
          },
          onEffects: (effects) => {
            claims += effects.filter(
              (effect) => effect.type === "advanced-bonus-claimed",
            ).length;
          },
        });

        expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
        expect(isGameOver(finalState)).toBe(true);
        assertStealNodeInvariants(finalState, chargedNodeCount);
        assertAdvancedBonusInvariants(finalState, chargedNodeCount);

        // Not vacuous: the bonus-preferring policy actually races for and
        // claims bonuses over the course of the game.
        expect(claims).toBeGreaterThan(0);
      },
    );
  },
);

describe("a full game, end to end", () => {
  it("refuses an attack, not only a move and a pass, once the game is over", () => {
    // Built rather than played out, so the attack refusal does not depend
    // on two ships happening to end a played game within range of each
    // other: green-1 and red-1 sit two squares apart with a clear lane
    // between them, well within a full-power ship's reach (rules.md §6).
    const state: GameState = {
      ships: [
        {
          id: "green-1" as ShipId,
          side: "green",
          square: squareFromName("G8"),
          power: 4,
        },
        {
          id: "red-1" as ShipId,
          side: "red",
          square: squareFromName("G10"),
          power: 4,
        },
      ],
      nodes: {},
      sideToMove: "green",
      plyNumber: pliesForGameLength(1) + 1,
      randomSeed: 1,
      openingSeed: 1,
      nodePlaystyle: "continuous",
      rotators: [],
      planetBonus: "off",
      bonusPlanets: { green: [], red: [] },
      advancedBonuses: [],
      energy: { green: 0, red: 0 },
      lengthInRounds: 1,
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
      outOfTime: { green: false, red: false },
      combatEnabled: true,
      scoring: "simple",
      playerMatching: "off",
    };

    expect(isGameOver(state)).toBe(true);
    expect(assertRefusesEverything(state)).toBe(true);
  });

  it("plays to its last round on moves alone when combat is off, and never deadlocks", () => {
    const seed = 20260819;
    const { finalState, attacksApplied } = playFullGame(seed, 100, {
      combatEnabled: false,
    });

    // Reaching this point at all is most of the proof: `playFullGame` throws
    // if the policy ever runs out of legal plies before the game ends
    // (rules.md §5's never-deadlock guarantee, with combat off).
    expect(finalState.plyNumber).toBe(pliesForGameLength(100) + 1);
    expect(isGameOver(finalState)).toBe(true);
    expect(finalState.combatEnabled).toBe(false);
    expect(attacksApplied).toBe(0);
  });
});

describe("smaller fleets play end to end (rules.md §4)", () => {
  describe.each(CHARGED_NODE_COUNTS)(
    "at %d charged nodes",
    (chargedNodeCount) => {
      it("plays a five-a-side game to its end, with totals consistent throughout", () => {
        const seed = 20260819;
        const { finalState, greenCollected, redCollected } = playFullGame(
          seed,
          30,
          { fleetSize: 5, chargedNodeCount },
        );

        expect(finalState.ships).toHaveLength(10);
        expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
        expect(isGameOver(finalState)).toBe(true);

        expect(finalState.energy.green).toBe(sumAmounts(greenCollected));
        expect(finalState.energy.red).toBe(sumAmounts(redCollected));
      });

      it("plays a three-a-side game to its end, with totals consistent throughout", () => {
        const seed = 20260819;
        const { finalState, greenCollected, redCollected } = playFullGame(
          seed,
          30,
          { fleetSize: 3, chargedNodeCount },
        );

        expect(finalState.ships).toHaveLength(6);
        expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
        expect(isGameOver(finalState)).toBe(true);

        expect(finalState.energy.green).toBe(sumAmounts(greenCollected));
        expect(finalState.energy.red).toBe(sumAmounts(redCollected));
      });

      it("plays a four-a-side game to its end, with totals consistent throughout", () => {
        const seed = 20260819;
        const { finalState, greenCollected, redCollected } = playFullGame(
          seed,
          30,
          { fleetSize: 4, chargedNodeCount },
        );

        expect(finalState.ships).toHaveLength(8);
        expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
        expect(isGameOver(finalState)).toBe(true);

        expect(finalState.energy.green).toBe(sumAmounts(greenCollected));
        expect(finalState.energy.red).toBe(sumAmounts(redCollected));
      });
    },
  );

  it("starts a five-ship game with H15 occupied and O14, O2, A14, A2 empty, as ordinary squares, and lets a ship move into one of them", () => {
    const state = startingGameState(20260819, {
      lengthInRounds: 30,
      fleetSize: 5,
      combatEnabled: true,
    });
    const shipSquareNames = new Set(
      state.ships.map((s) => squareName(s.square)),
    );

    expect(shipSquareNames.has("H15")).toBe(true);
    for (const emptySquare of ["O14", "O2", "A14", "A2"]) {
      expect(shipSquareNames.has(emptySquare)).toBe(false);
    }

    // green-1 (H15 at the start of a five-ship game) relocated within reach
    // of O14, no longer a starting square under any fleet size: it is an
    // ordinary destination like any other, since a board square carries
    // none of a planet's properties (rules.md §4).
    const nearO14: GameState = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === "green-1" ? { ...s, square: squareFromName("O12") } : s,
      ),
    };
    expect(legalDestinations(nearO14, "green-1")).toContainEqual(
      squareFromName("O14"),
    );
  });

  it("draws both fighting ships' returns only from the planets left empty, tight to a five-ship game's own arithmetic", () => {
    // A five-ship game has ten ships in all — the largest fleet the rules
    // allow (rules.md §4) — so with the fight's own two excluded, at most
    // eight other ships can occupy a planet, and at least four of the
    // twelve are free: the tightest §7.1's arithmetic ever gets.
    const emptyPlanetNames = PLANETS.slice(0, 4).map(squareName);
    const state: GameState = {
      ships: [
        ...shipsFillingPlanetsExcept(emptyPlanetNames),
        ship("green-1", "green", "H8"),
        ship("red-1", "red", "H9"),
      ],
      nodes: {},
      sideToMove: "green",
      plyNumber: 1,
      randomSeed: 1,
      openingSeed: 1,
      nodePlaystyle: "continuous",
      rotators: [],
      planetBonus: "off",
      bonusPlanets: { green: [], red: [] },
      advancedBonuses: [],
      energy: { green: 0, red: 0 },
      lengthInRounds: 30,
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
      outOfTime: { green: false, red: false },
      combatEnabled: true,
      scoring: "simple",
      playerMatching: "off",
    };

    const result = applyAttack(state, "green-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const fightResolved = result.effects.find(
      (effect) => effect.type === "fight-resolved",
    );
    if (
      fightResolved === undefined ||
      fightResolved.type !== "fight-resolved"
    ) {
      throw new Error("expected a fight-resolved effect");
    }
    // Both ships were on the board and not on a planet, and only four
    // planets were left free of the twelve — §7.1's "there is always
    // somewhere to go", in its two-ship form.
    expect(fightResolved.returns).toHaveLength(2);
    const returnedPlanetNames = fightResolved.returns.map((entry) =>
      squareName(entry.to),
    );
    for (const planetName of returnedPlanetNames) {
      expect(emptyPlanetNames).toContain(planetName);
    }
    expect(new Set(returnedPlanetNames).size).toBe(2);
  });

  it("settles a five-ship game with no throw when a side occupies five depleted nodes", () => {
    const depletedNodes = ["C3", "F3", "C6", "F6", "C9"].map(squareFromName);
    const ships: readonly Ship[] = depletedNodes.map((node, index) => ({
      id: `green-${index + 1}` as ShipId,
      side: "green",
      square: node,
      power: 4,
    }));
    const nodes: Record<string, NodeStatus> = {};
    for (const node of depletedNodes) {
      nodes[squareName(node)] = { state: "depleted", level: 1 };
    }
    const state: GameState = {
      ships,
      nodes,
      sideToMove: "green",
      plyNumber: 1,
      randomSeed: 1,
      openingSeed: 1,
      nodePlaystyle: "continuous",
      rotators: [],
      planetBonus: "off",
      bonusPlanets: { green: [], red: [] },
      advancedBonuses: [],
      energy: { green: 50, red: 0 },
      lengthInRounds: 30,
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
      outOfTime: { green: false, red: false },
      combatEnabled: true,
      scoring: "simple",
      playerMatching: "off",
    };

    expect(() => runEndOfTurn(state)).not.toThrow();
  });
});
