// An integration test: plays a whole game through the public rules API and
// proves the collection (§8.4), the round arithmetic (§9) and the ending
// work together as one. The action policy below is deterministic and lives
// only in this file — the rules layer implements the rules, not how to play
// them — and draws no randomness of its own, so it never perturbs §8.2's
// seeded charge draws.

import { describe, expect, it } from "vitest";
import {
  COLUMN_LETTERS,
  type Square,
  squareFromName,
  squareName,
} from "./board";
import { BAYS } from "./bays";
import { legalTargets } from "./combat";
import { DEFAULT_FLEET_SIZE, type FleetSize, type ShipId } from "./fleet";
import { gameResult, isGameOver, pliesForGameLength } from "./gameLength";
import {
  type GameState,
  type Ship,
  type SiteStatus,
  siteStateAt,
  startingGameState,
} from "./gameState";
import {
  type EnergyCollectedEffect,
  type EnergyPenaltyEffect,
  runEndOfTurn,
} from "./endOfTurn";
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

/**
 * The distance from `square` to the nearest charged or active site right
 * now. Active means eligible to be charged (rules.md §8.1), so this heads
 * for either a node or a site that might become one — heading for a
 * dormant site would be pointless, since it cannot be charged next.
 */
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
 * close the distance to the nearest charged-or-eligible-to-be-charged site,
 * otherwise attack, otherwise pass. Evaluated fresh for every action.
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

/** The `energy-penalty` effects nested inside a ply's end-of-turn effects, if any. */
function energyPenaltyEffects(
  effects: readonly (MoveEffect | AttackEffect)[] | readonly [PassEffect],
): readonly EnergyPenaltyEffect[] {
  const penalties: EnergyPenaltyEffect[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "energy-penalty") {
          penalties.push(sub);
        }
      }
    }
  }
  return penalties;
}

/** A hard ceiling on actions applied, so a regression hangs the assertion, not the test runner. */
const MAX_ACTIONS = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly greenCollected: readonly EnergyCollectedEffect[];
  readonly redCollected: readonly EnergyCollectedEffect[];
  readonly greenPenalized: readonly EnergyPenaltyEffect[];
  readonly redPenalized: readonly EnergyPenaltyEffect[];
}

/**
 * Plays a whole game from `seed` at `lengthInRounds` using the greedy policy
 * above, dealt with `fleetSize` ships a side (rules.md §4, default seven).
 */
function playFullGame(
  seed: number,
  lengthInRounds: number,
  fleetSize: FleetSize = DEFAULT_FLEET_SIZE,
): PlayedGame {
  let state = startingGameState(seed, lengthInRounds, fleetSize);
  const greenCollected: EnergyCollectedEffect[] = [];
  const redCollected: EnergyCollectedEffect[] = [];
  const greenPenalized: EnergyPenaltyEffect[] = [];
  const redPenalized: EnergyPenaltyEffect[] = [];

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
    for (const penalized of energyPenaltyEffects(effects)) {
      (penalized.side === "green" ? greenPenalized : redPenalized).push(
        penalized,
      );
    }
  }

  return {
    finalState: state,
    greenCollected,
    redCollected,
    greenPenalized,
    redPenalized,
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
 * earlier was found to refuse: under one action per turn, a short game may
 * end before any two ships come within reach of one another, so the caller
 * decides whether that absence is expected (rules.md §5).
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

function sumAmounts(
  effects: readonly (EnergyCollectedEffect | EnergyPenaltyEffect)[],
): number {
  return effects.reduce((total, effect) => total + effect.amount, 0);
}

/** One ship, for building a state by hand rather than dealing it. */
function ship(id: ShipId, side: "green" | "red", square: string): Ship {
  return { id, side, square: squareFromName(square), power: 4 };
}

/**
 * A ship parked on every bay except those named in `emptyBayNames`, so a
 * return draw's pool (`drawReturnBay`, rules.md §7.1) is exactly those bays.
 */
function shipsFillingBaysExcept(
  emptyBayNames: readonly string[],
): readonly Ship[] {
  return BAYS.filter(
    (square) => !emptyBayNames.includes(squareName(square)),
  ).map((square, index) =>
    ship(`filler-${index}` as ShipId, "red", squareName(square)),
  );
}

describe("a full game, end to end", () => {
  it("plays a hundred-round game to its end, with totals consistent throughout", () => {
    const seed = 20260819;
    const {
      finalState,
      greenCollected,
      redCollected,
      greenPenalized,
      redPenalized,
    } = playFullGame(seed, 100);

    expect(finalState.plyNumber).toBe(pliesForGameLength(100) + 1);
    expect(isGameOver(finalState)).toBe(true);

    // The ledger holds exactly (§8.4, §8.6 step 2): a side's final total is
    // what it collected for the charged nodes it held minus what it paid
    // for the dormant sites it occupied, penny for penny — the penalty
    // effect always reports the energy actually deducted, never the table
    // price, so a floored turn still balances this identity.
    expect(finalState.energy.green).toBe(
      sumAmounts(greenCollected) - sumAmounts(greenPenalized),
    );
    expect(finalState.energy.red).toBe(
      sumAmounts(redCollected) - sumAmounts(redPenalized),
    );

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
    const {
      finalState,
      greenCollected,
      redCollected,
      greenPenalized,
      redPenalized,
    } = playFullGame(seed, 3);

    expect(finalState.plyNumber).toBe(pliesForGameLength(3) + 1);
    expect(isGameOver(finalState)).toBe(true);

    expect(finalState.energy.green).toBe(
      sumAmounts(greenCollected) - sumAmounts(greenPenalized),
    );
    expect(finalState.energy.red).toBe(
      sumAmounts(redCollected) - sumAmounts(redPenalized),
    );

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
    // reach of one another, so no attack is expected here; the move
    // and pass refusals are still checked.
    assertRefusesEverything(finalState);
  });

  it("refuses an attack, not only a move and a pass, once the game is over", () => {
    // Built rather than played out, so the attack refusal does not depend
    // on two ships happening to end a played game within range of each
    // other: green-1 and red-1 sit three squares apart with a clear lane
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
          square: squareFromName("G11"),
          power: 4,
        },
      ],
      siteStates: {},
      sideToMove: "green",
      actionsRemaining: 1,
      actedThisPly: [],
      plyNumber: pliesForGameLength(1) + 1,
      randomSeed: 1,
      energy: { green: 0, red: 0 },
      lengthInRounds: 1,
    };

    expect(isGameOver(state)).toBe(true);
    expect(assertRefusesEverything(state)).toBe(true);
  });
});

describe("smaller fleets play end to end (rules.md §4)", () => {
  it("plays a five-a-side game to its end, with totals consistent throughout", () => {
    const seed = 20260819;
    const {
      finalState,
      greenCollected,
      redCollected,
      greenPenalized,
      redPenalized,
    } = playFullGame(seed, 30, 5);

    expect(finalState.ships).toHaveLength(10);
    expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
    expect(isGameOver(finalState)).toBe(true);

    expect(finalState.energy.green).toBe(
      sumAmounts(greenCollected) - sumAmounts(greenPenalized),
    );
    expect(finalState.energy.red).toBe(
      sumAmounts(redCollected) - sumAmounts(redPenalized),
    );
  });

  it("plays a six-a-side game to its end, with totals consistent throughout", () => {
    const seed = 20260819;
    const {
      finalState,
      greenCollected,
      redCollected,
      greenPenalized,
      redPenalized,
    } = playFullGame(seed, 30, 6);

    expect(finalState.ships).toHaveLength(12);
    expect(finalState.plyNumber).toBe(pliesForGameLength(30) + 1);
    expect(isGameOver(finalState)).toBe(true);

    expect(finalState.energy.green).toBe(
      sumAmounts(greenCollected) - sumAmounts(greenPenalized),
    );
    expect(finalState.energy.red).toBe(
      sumAmounts(redCollected) - sumAmounts(redPenalized),
    );
  });

  it("starts a five-ship game with H15 occupied and O14, O2, A14, A2 empty, and lets a ship move into one of them", () => {
    const state = startingGameState(20260819, 30, 5);
    const occupiedBayNames = new Set(
      state.ships
        .map((s) => squareName(s.square))
        .filter((name) => BAYS.some((bay) => squareName(bay) === name)),
    );

    expect(occupiedBayNames.has("H15")).toBe(true);
    for (const emptyBay of ["O14", "O2", "A14", "A2"]) {
      expect(occupiedBayNames.has(emptyBay)).toBe(false);
    }

    // green-1 (H15 at the start of a five-ship game) relocated within reach
    // of O14, one of the bays that started empty: it is an ordinary
    // destination like any other.
    const nearO14: GameState = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === "green-1" ? { ...s, square: squareFromName("O11") } : s,
      ),
    };
    expect(legalDestinations(nearO14, "green-1")).toContainEqual(
      squareFromName("O14"),
    );
  });

  it("starts a six-ship game with L15 occupied and H15, H1 empty, and lets a ship move into one of them", () => {
    const state = startingGameState(20260819, 30, 6);
    const occupiedBayNames = new Set(
      state.ships
        .map((s) => squareName(s.square))
        .filter((name) => BAYS.some((bay) => squareName(bay) === name)),
    );

    expect(occupiedBayNames.has("L15")).toBe(true);
    for (const emptyBay of ["H15", "H1"]) {
      expect(occupiedBayNames.has(emptyBay)).toBe(false);
    }

    // green-1 (O14 at the start of a six-ship game) relocated within reach
    // of H15, one of the two bays that started empty.
    const nearH15: GameState = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === "green-1" ? { ...s, square: squareFromName("H12") } : s,
      ),
    };
    expect(legalDestinations(nearH15, "green-1")).toContainEqual(
      squareFromName("H15"),
    );
  });

  it("draws both fighting ships' returns only from the bays empty at the start, in a five-ship game", () => {
    const emptyBayNames = ["O14", "O2", "A14", "A2"];
    const state: GameState = {
      ships: [
        ...shipsFillingBaysExcept(emptyBayNames),
        ship("green-1", "green", "H8"),
        ship("red-1", "red", "H9"),
      ],
      siteStates: {},
      sideToMove: "green",
      actionsRemaining: 1,
      actedThisPly: [],
      plyNumber: 1,
      randomSeed: 1,
      energy: { green: 0, red: 0 },
      lengthInRounds: 30,
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
    // Both ships were on the board and not in a bay, so exactly two bays
    // are free — §7.1's "there is always somewhere to go", in its two-ship
    // form.
    expect(fightResolved.returns).toHaveLength(2);
    const returnedBayNames = fightResolved.returns.map((entry) =>
      squareName(entry.to),
    );
    for (const bayName of returnedBayNames) {
      expect(emptyBayNames).toContain(bayName);
    }
    expect(new Set(returnedBayNames).size).toBe(2);
  });

  it("draws both fighting ships' returns only from the bays empty at the start, in a six-ship game", () => {
    const emptyBayNames = ["H15", "H1"];
    const state: GameState = {
      ships: [
        ...shipsFillingBaysExcept(emptyBayNames),
        ship("green-1", "green", "H8"),
        ship("red-1", "red", "H9"),
      ],
      siteStates: {},
      sideToMove: "green",
      actionsRemaining: 1,
      actedThisPly: [],
      plyNumber: 1,
      randomSeed: 1,
      energy: { green: 0, red: 0 },
      lengthInRounds: 30,
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
    // Exactly two bays are free, and this fight's two ships must fill both.
    expect(fightResolved.returns).toHaveLength(2);
    const returnedBayNames = fightResolved.returns.map((entry) =>
      squareName(entry.to),
    );
    expect(new Set(returnedBayNames)).toEqual(new Set(emptyBayNames));
  });

  it("settles a five-ship game with no throw when a side occupies five dormant sites (regression for energy.ts's ships-per-side bound)", () => {
    const dormantSites = SITES.slice(0, 5);
    const ships: readonly Ship[] = dormantSites.map((site, index) => ({
      id: `green-${index + 1}` as ShipId,
      side: "green",
      square: site,
      power: 4,
    }));
    const siteStates: Record<string, SiteStatus> = {};
    for (const site of dormantSites) {
      siteStates[squareName(site)] = { state: "dormant", level: 1 };
    }
    const state: GameState = {
      ships,
      siteStates,
      sideToMove: "green",
      actionsRemaining: 1,
      actedThisPly: [],
      plyNumber: 1,
      randomSeed: 1,
      energy: { green: 50, red: 0 },
      lengthInRounds: 30,
    };

    expect(() => runEndOfTurn(state)).not.toThrow();
  });
});
