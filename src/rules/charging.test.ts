import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  squareFromName,
  squareName,
} from "./board";
import { runCharging } from "./charging";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { drawUniformSquare, legalNodePool } from "./nodePlacement";
import type { PowerLevel } from "./power";
import { mulberry32 } from "./random";
import { TARGET_CHARGED_NODES, type NodeState } from "./nodes";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, level]]) => [
      name,
      { state, level },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, readonly [NodeState, number]>>;
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 5,
    randomSeed: config.randomSeed ?? 1,
    openingSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("runCharging — the shortfall (§8.2, §8.6 step 4)", () => {
  it("charges the priority-3 node alone when the shortfall is one", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("N4") },
    ]);
    expect(result.state.nodes.N4).toEqual({ state: "charged", level: 0 });
    expect(result.state.nodes.D8).toEqual({ state: "inactive", level: 1 });
    expect(result.state.nodes.H8).toEqual({ state: "inactive", level: 2 });
  });

  it("charges the priority-3 and priority-2 nodes, in that order, when the shortfall is two", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 0],
        J2: ["charged", 0],
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("N4") },
      { type: "node-charged", square: squareFromName("H8") },
    ]);
    expect(result.state.nodes.D8).toEqual({ state: "inactive", level: 1 });
  });

  it("charges all three inactive nodes, highest priority first, when the shortfall is three", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 0],
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("N4") },
      { type: "node-charged", square: squareFromName("H8") },
      { type: "node-charged", square: squareFromName("D8") },
    ]);
  });

  it("charges nothing when four are already charged", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
        K5: ["inactive", 3],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });

  it("fills a shortfall of four with the three queue nodes, in priority order, then a fourth placed directly", () => {
    const state = buildState({
      nodes: {
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    expect(result.effects.slice(0, 3)).toEqual([
      { type: "node-charged", square: squareFromName("N4") },
      { type: "node-charged", square: squareFromName("H8") },
      { type: "node-charged", square: squareFromName("D8") },
    ]);
    expect(result.effects).toHaveLength(4);
    expect(result.effects[3].type).toBe("node-appeared-charged");
    const chargedCount = Object.values(result.state.nodes).filter(
      (status) => status.state === "charged",
    ).length;
    expect(chargedCount).toBe(TARGET_CHARGED_NODES);
  });

  it("never places a fourth node when the shortfall is three, the largest the queue alone can cover", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 0],
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    expect(
      result.effects.some((effect) => effect.type === "node-appeared-charged"),
    ).toBe(false);
    expect(result.effects).toHaveLength(3);
  });
});

describe("runCharging — the direct fourth placement (§8.2, §8.6 step 4)", () => {
  it("places the fourth node at drain 0, legal under the widened pool at the moment it appears, and never on the outer edge", () => {
    const state = buildState({
      nodes: {
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const result = runCharging(state);

    const appeared = result.effects.find(
      (effect) => effect.type === "node-appeared-charged",
    );
    if (appeared === undefined) {
      throw new Error("expected a node-appeared-charged effect");
    }
    const occupiedBeforeAppearing = [
      squareFromName("N4"),
      squareFromName("D8"),
      squareFromName("H8"),
    ];
    const widenedPool = legalNodePool(occupiedBeforeAppearing, [], "widened");

    expect(widenedPool).toContainEqual(appeared.square);
    expect(appeared.square.row).not.toBe(1);
    expect(appeared.square.row).not.toBe(BOARD_SIZE);
    expect(appeared.square.column).not.toBe(COLUMN_LETTERS[0]);
    expect(appeared.square.column).not.toBe(
      COLUMN_LETTERS[COLUMN_LETTERS.length - 1],
    );

    const level = result.state.nodes[squareName(appeared.square)];
    expect(level).toEqual({ state: "charged", level: 0 });
  });

  it("consumes exactly one seed step, drawn uniformly from the widened pool, and the same seed places the same square", () => {
    const state = buildState({ randomSeed: 77, nodes: {} });
    const [, expectedSeed] = mulberry32(77);
    const expectedPool = legalNodePool([], [], "widened");
    const [expectedSquare] = drawUniformSquare(expectedPool, 77);

    const first = runCharging(state);
    const second = runCharging(state);

    expect(first.state.randomSeed).toBe(expectedSeed);
    expect(second).toEqual(first);
    const appeared = first.effects.find(
      (effect) => effect.type === "node-appeared-charged",
    );
    if (appeared === undefined) {
      throw new Error("expected a node-appeared-charged effect");
    }
    expect(appeared.square).toEqual(expectedSquare);
  });
});

describe("runCharging — consumes no randomness", () => {
  it("leaves the seed exactly as it found it, whether or not anything charges", () => {
    const withShortfall = buildState({
      randomSeed: 42,
      nodes: {
        F2: ["charged", 0],
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });
    const withoutShortfall = buildState({
      randomSeed: 42,
      nodes: {
        F2: ["charged", 0],
        J2: ["charged", 0],
        B4: ["charged", 0],
        H4: ["charged", 0],
      },
    });

    expect(runCharging(withShortfall).state.randomSeed).toBe(42);
    expect(runCharging(withoutShortfall).state.randomSeed).toBe(42);
  });
});

describe("runCharging — the pool", () => {
  it("never charges a depleted node, even when the board is short", () => {
    // Three charged nodes keep the shortfall at one rather than four, so
    // this stays a pure test of the depleted node's own immunity — a
    // shortfall of four would also place a fourth node directly (tested
    // separately below) and that is not this test's subject.
    const state = buildState({
      nodes: {
        F2: ["depleted", 0],
        C3: ["charged", 1],
        E3: ["charged", 1],
        G3: ["charged", 1],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });

  it("charges an occupied inactive node like any other, under the ship standing on it", () => {
    // Three charged nodes keep the shortfall at one, so only F2 charges —
    // a shortfall of four would also place a fourth node directly, which is
    // not this test's subject.
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 3)],
      nodes: {
        F2: ["inactive", 3],
        C3: ["charged", 1],
        E3: ["charged", 1],
        G3: ["charged", 1],
      },
    });

    const result = runCharging(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("F2") },
    ]);
    expect(result.state.nodes.F2).toEqual({ state: "charged", level: 0 });
    const occupant = result.state.ships.find((s) => s.id === "green-1");
    expect(occupant?.square).toEqual(squareFromName("F2"));
  });
});

describe("runCharging — determinism", () => {
  it("produces the same result from the same state every time — there is nothing random to replay", () => {
    const state = buildState({
      nodes: {
        N4: ["inactive", 3],
        D8: ["inactive", 1],
        H8: ["inactive", 2],
      },
    });

    const first = runCharging(state);
    const second = runCharging(state);

    expect(second).toEqual(first);
  });
});
