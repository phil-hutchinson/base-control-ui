import { describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import { legalTargets } from "../rules/combat";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { type GameState, type NodeStatus, type Ship } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import type { ChargedNodeCount } from "../rules/nodes";
import type { NodePlaystyle } from "../rules/nodePlaystyle";
import { applyAttack, applyMove } from "../rules/ply";
import type { PowerLevel } from "../rules/power";
import { seededRandom } from "../rules/random";
import type { Side } from "../rules/fleet";
import { applyPly } from "./applyPly";
import type { Ply } from "./plyNotation";
import { type Setup, startGame } from "./setup";

function ship(
  id: string,
  side: Side,
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

type NodeState = NodeStatus["state"];

function nodeStatuses(
  states: Readonly<Record<string, NodeState | readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, entry]) => {
      const [state, level] = Array.isArray(entry) ? entry : [entry, 0];
      return [name, { state, level }];
    }),
  );
}

/** A hand-built `GameState`, matching `ply.test.ts`'s own harness. */
function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: Side;
  nodes?: Readonly<Record<string, NodeState | readonly [NodeState, number]>>;
  plyNumber?: number;
  lengthInRounds?: number;
  chargedNodeCount?: ChargedNodeCount;
  energy?: { green: number; red: number };
  outOfTime?: { green: boolean; red: boolean };
  combatEnabled?: boolean;
  nodePlaystyle?: NodePlaystyle;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    nodePlaystyle: config.nodePlaystyle ?? "continuous",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    planetActivity: "off",
    activityBonuses: [],
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? 4,
    outOfTime: config.outOfTime ?? { green: false, red: false },
    combatEnabled: config.combatEnabled ?? true,
    scoring: "simple",
    playerMatching: "off",
  };
}

function move(from: string, to: string): Ply {
  return { type: "move", from: squareFromName(from), to: squareFromName(to) };
}

function attack(from: string, target: string): Ply {
  return {
    type: "attack",
    from: squareFromName(from),
    target: squareFromName(target),
  };
}

/** Freezes `value` and everything reachable from it, so a mutation anywhere throws. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const FROZEN_SETUP: Setup = {
  playstyle: "continuous",
  rounds: 30,
  fleetSize: 3,
  chargedNodes: 4,
  combat: true,
  scoring: "simple",
  planetBonus: "off",
  planetActivity: "off",
  playerMatching: "off",
  artwork: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14],
};

const STEAL_WITH_PLANET_EFFECTS: Setup = {
  playstyle: "steal",
  rounds: 30,
  fleetSize: 5,
  chargedNodes: 4,
  combat: false,
  scoring: "bonus",
  planetBonus: "off",
  planetActivity: "race",
  playerMatching: "required",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};

const DEDICATED_WITH_PLANET_BONUS: Setup = {
  playstyle: "dedicated",
  rounds: 30,
  fleetSize: 4,
  chargedNodes: 3,
  combat: true,
  scoring: "simple",
  planetBonus: "three",
  playerMatching: "off",
  planetActivity: "off",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};

/**
 * One ply for the side to move: an attack on the nearest legal target if
 * one of its ships has one, so a combat-on game exercises attacks; failing
 * that, the move that brings a ship closest to an enemy ship, so the
 * fleets close distance instead of drifting apart. `null` once the side to
 * move has neither.
 */
function closingPolicyPly(state: GameState): Ply | null {
  const myShips = state.ships.filter(
    (candidate) => candidate.side === state.sideToMove,
  );
  const enemyShips = state.ships.filter(
    (candidate) => candidate.side !== state.sideToMove,
  );

  for (const attacker of myShips) {
    const target = legalTargets(state, attacker.id)[0];
    if (target !== undefined) {
      return { type: "attack", from: attacker.square, target };
    }
  }

  let bestShip: GameState["ships"][number] | null = null;
  let bestDestination: ReturnType<typeof legalDestinations>[number] | null =
    null;
  let bestDistance = Infinity;
  for (const mover of myShips) {
    for (const destination of legalDestinations(state, mover.id)) {
      const distance = Math.min(
        ...enemyShips.map((enemy) =>
          Math.max(
            Math.abs(
              destination.column.charCodeAt(0) -
                enemy.square.column.charCodeAt(0),
            ),
            Math.abs(destination.row - enemy.square.row),
          ),
        ),
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestShip = mover;
        bestDestination = destination;
      }
    }
  }
  if (bestShip === null || bestDestination === null) {
    return null;
  }
  return { type: "move", from: bestShip.square, to: bestDestination };
}

/** Every ply `closingPolicyPly` finds, up to `maxPlies`, with the state it was applied to. */
function playClosingPolicyGame(
  setup: Setup,
  seed: number,
  maxPlies: number,
): readonly { before: GameState; plyNumber: number; ply: Ply }[] {
  const random = seededRandom(seed);
  let state = startGame(setup, random).state;
  const steps: { before: GameState; plyNumber: number; ply: Ply }[] = [];

  for (let i = 0; i < maxPlies; i++) {
    const ply = closingPolicyPly(state);
    if (ply === null) {
      break;
    }
    const before = state;
    const plyNumber = state.plyNumber;
    const result = applyPly(state, plyNumber, ply, random);
    if (result.outcome !== "applied") {
      throw new Error(`expected ${JSON.stringify(ply)} to apply`);
    }
    steps.push({ before, plyNumber, ply });
    state = result.state;
  }

  return steps;
}

describe("applyPly", () => {
  it("applies a legal move, with ship-moved first and the rules' own effects after", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1", 4), ship("red-1", "red", "O15")],
    });
    const ply = move("A1", "A2");

    const result = applyPly(state, 1, ply, seededRandom(7));
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }

    const direct = applyMove(
      state,
      "green-1",
      squareFromName("A2"),
      seededRandom(7),
    );
    if (direct.outcome !== "applied") {
      throw new Error("expected the direct move to be applied");
    }

    expect(result.state).toEqual(direct.state);
    expect(result.effects[0]).toEqual({
      type: "ship-moved",
      shipId: "green-1",
      side: "green",
      from: squareFromName("A1"),
      to: squareFromName("A2"),
      cost: direct.cost,
      powerAfter: direct.powerAfter,
    });
    expect(result.effects.slice(1)).toEqual(direct.effects);

    const drawsOnly = seededRandom(7);
    applyMove(state, "green-1", squareFromName("A2"), drawsOnly);
    expect(result.draws).toEqual(drawsOnly.draws());
  });

  it("applies a legal attack (combat on), with the rules' own effects and no ship-moved", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
      combatEnabled: true,
    });
    const ply = attack("H8", "H9");

    const result = applyPly(state, 1, ply, seededRandom(11));
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }

    const direct = applyAttack(
      state,
      "green-1",
      squareFromName("H9"),
      seededRandom(11),
    );
    if (direct.outcome !== "applied") {
      throw new Error("expected the direct attack to be applied");
    }

    expect(result.state).toEqual(direct.state);
    expect(result.effects).toEqual(direct.effects);
    expect(result.effects[0]?.type).toBe("fight-resolved");

    const drawsOnly = seededRandom(11);
    applyAttack(state, "green-1", squareFromName("H9"), drawsOnly);
    expect(result.draws).toEqual(drawsOnly.draws());
  });

  it("refuses with game-over once the game has ended, regardless of the ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "A2")],
      plyNumber: 61,
      lengthInRounds: 30,
    });

    const result = applyPly(state, 61, move("A1", "A3"), seededRandom(1));

    expect(result).toEqual({ outcome: "refused", reason: "game-over" });
  });

  it("refuses with wrong-ply-number when the given ply number does not match the state", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
      plyNumber: 5,
    });

    const result = applyPly(state, 6, move("A1", "A2"), seededRandom(1));

    expect(result).toEqual({ outcome: "refused", reason: "wrong-ply-number" });
  });

  it("refuses with no-ship-there when the first square of a move is empty", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
    });

    const result = applyPly(state, 1, move("H8", "H9"), seededRandom(1));

    expect(result).toEqual({ outcome: "refused", reason: "no-ship-there" });
  });

  it("refuses with not-your-ship when the first square holds the other side's ship", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
    });

    const result = applyPly(state, 1, move("O15", "O14"), seededRandom(1));

    expect(result).toEqual({ outcome: "refused", reason: "not-your-ship" });
  });

  it("refuses with another of the rules' own move reasons (destination-occupied)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "A2")],
    });

    const result = applyPly(state, 1, move("A1", "A2"), seededRandom(1));

    expect(result).toEqual({
      outcome: "refused",
      reason: "destination-occupied",
    });
  });

  it("refuses every attack with combat-is-off, even from an empty square", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
      combatEnabled: false,
    });

    const result = applyPly(state, 1, attack("H8", "H9"), seededRandom(1));

    expect(result).toEqual({ outcome: "refused", reason: "combat-is-off" });
  });

  it("leaves the source's draw list unchanged when the ply is refused", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
      plyNumber: 5,
    });
    const random = seededRandom(1);

    expect(() => applyPly(state, 6, move("A1", "A2"), random)).not.toThrow();
    expect(random.draws()).toEqual([]);
  });

  it("reports an automatic pass, with its own end-of-turn draws after the triggering ply's own, and skips the passed ply number", () => {
    // Green moves a ship nothing else touches (O1 -> O2). That move's own
    // end-of-turn promotes the sole inactive node (A6) to charged, which
    // sweeps the queue and draws three fresh inactive squares — the "ply's
    // own" draws. Red (hemmed in on F6 by green's four neighbours, with
    // combat off so it has no attack either) then passes automatically; its
    // own end-of-turn sees the charged count still short of
    // chargedNodeCount and promotes two of the freshly drawn inactive
    // squares, sweeping the queue a second time — the pass's own draws,
    // which must appear after the move's.
    const state = buildState({
      ships: [
        ship("green-mover", "green", "O1"),
        ship("green-e6", "green", "E6"),
        ship("green-g6", "green", "G6"),
        ship("green-f5", "green", "F5"),
        ship("green-f7", "green", "F7"),
        ship("red-1", "red", "F6", 0),
      ],
      nodes: { A6: "inactive" },
      chargedNodeCount: 3,
      combatEnabled: false,
    });

    const random = seededRandom(1);
    const result = applyPly(state, 1, move("O1", "O2"), random);
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }

    expect(
      result.effects.filter((effect) => effect.type === "ply-ended"),
    ).toHaveLength(1);
    const passed = result.effects.find(
      (effect) => effect.type === "ply-passed",
    );
    expect(passed).toMatchObject({
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
    });

    const plyEndedIndex = result.effects.findIndex(
      (effect) => effect.type === "ply-ended",
    );
    const passedIndex = result.effects.findIndex(
      (effect) => effect.type === "ply-passed",
    );
    expect(plyEndedIndex).toBeGreaterThanOrEqual(0);
    expect(passedIndex).toBeGreaterThan(plyEndedIndex);

    // Both end-of-turn sequences charged something and so refilled the
    // queue (four draws each: three squares and a priority permutation),
    // and the pass's own draws come after the triggering ply's own.
    expect(result.draws.length).toBe(8);

    expect(result.state.sideToMove).toBe("green");
    expect(result.state.plyNumber).toBe(3);
  });

  it("gives the same result when applied twice to a deeply frozen state, and never throws", () => {
    const { state } = startGame(FROZEN_SETUP, seededRandom(42));
    const frozen = deepFreeze(state);
    const mover = frozen.ships.find((candidate) => candidate.side === "green");
    if (mover === undefined) {
      throw new Error("expected a green ship to move");
    }
    const destination = legalDestinations(frozen, mover.id)[0];
    if (destination === undefined) {
      throw new Error("expected green's first ship to have a legal move");
    }
    const ply = move(
      `${mover.square.column}${mover.square.row}`,
      `${destination.column}${destination.row}`,
    );

    const first = applyPly(frozen, 1, ply, seededRandom(99));
    const second = applyPly(frozen, 1, ply, seededRandom(99));

    expect(first).toEqual(second);
  });
});

describe("applyPly against a deeply frozen state, across a full policy game", () => {
  it.each([
    ["steal with planet effects", STEAL_WITH_PLANET_EFFECTS, 555],
    [
      "dedicated with planet bonus, combat on",
      DEDICATED_WITH_PLANET_BONUS,
      777,
    ],
  ])(
    "gives the same result applied twice, at every ply (%s)",
    (_label, setup, seed) => {
      const steps = playClosingPolicyGame(setup, seed, 40);
      expect(steps.length).toBeGreaterThan(10);

      for (const step of steps) {
        const frozen = deepFreeze(step.before);
        const first = applyPly(
          frozen,
          step.plyNumber,
          step.ply,
          seededRandom(99),
        );
        const second = applyPly(
          frozen,
          step.plyNumber,
          step.ply,
          seededRandom(99),
        );
        expect(first).toEqual(second);
      }
    },
  );

  it("covers a combat-on attack, not only moves", () => {
    const steps = playClosingPolicyGame(DEDICATED_WITH_PLANET_BONUS, 777, 40);

    expect(steps.some((step) => step.ply.type === "attack")).toBe(true);
  });
});

describe("startGame", () => {
  it("gives the same result when given a deeply frozen setup, and never throws", () => {
    const frozenSetup = deepFreeze({ ...FROZEN_SETUP });

    const first = startGame(frozenSetup, seededRandom(42));
    const second = startGame(frozenSetup, seededRandom(42));

    expect(first).toEqual(second);
  });
});
