import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import { runCharging } from "./charging";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, Ship, NodeStatus } from "./gameState";
import type { PowerLevel } from "./power";
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

  it("charges only the three queue nodes when the shortfall is four, leaving the fourth uncovered", () => {
    // A shortfall of four cannot arise in play (§8.3: at most one countdown
    // starts per turn, so at most one node expires per turn, plus at most
    // one node a player can walk off in the same turn — never more than
    // two). This is a hand-built fixture testing `runCharging`'s own
    // ceiling: it charges at most as many nodes as the queue holds and
    // stops, with no fourth node appearing from anywhere.
    const state = buildState({
      nodes: {
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
    const chargedCount = Object.values(result.state.nodes).filter(
      (status) => status.state === "charged",
    ).length;
    expect(chargedCount).toBe(TARGET_CHARGED_NODES - 1);
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
