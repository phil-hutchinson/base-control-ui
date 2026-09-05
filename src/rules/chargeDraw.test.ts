import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runChargeDraw } from "./chargeDraw";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, Ship, NodeStatus } from "./gameState";
import type { PowerLevel } from "./power";
import { drawWeightedIndex } from "./random";
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
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("runChargeDraw — the shortfall (§8.2, §8.6 step 4)", () => {
  it("charges one when three are charged and one is inactive", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        N4: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("N4") },
    ]);
    expect(result.state.nodes.N4).toEqual({
      state: "charged",
      level: 0,
    });
  });

  it("charges three when one is charged and exactly three are inactive", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        B4: ["inactive", 1],
        H4: ["inactive", 1],
        N4: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toHaveLength(3);
    const drawnNames = result.effects
      .map((effect) => squareName(effect.square))
      .sort();
    expect(drawnNames).toEqual(["B4", "H4", "N4"]);
    for (const name of ["B4", "H4", "N4"]) {
      expect(result.state.nodes[name]).toEqual({
        state: "charged",
        level: 0,
      });
    }
  });

  it("charges nothing and leaves the seed untouched when four are already charged", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
        K5: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });
});

describe("runChargeDraw — without replacement", () => {
  it("draws distinct nodes, advancing the seed once per node charged", () => {
    const state = buildState({
      randomSeed: 42,
      nodes: {
        F2: ["inactive", 1],
        J2: ["inactive", 1],
        B4: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toHaveLength(3);
    const drawnNames = result.effects.map((effect) =>
      squareName(effect.square),
    );
    expect(new Set(drawnNames).size).toBe(3);

    // Replaying the same draw by hand, one at a time without replacement and
    // weighted by each node's pressure, reaches the same final seed —
    // confirming the seed truly advances once per node charged and not, for
    // instance, once per candidate considered.
    let pool = [
      { square: squareFromName("F2"), weight: 1 },
      { square: squareFromName("J2"), weight: 1 },
      { square: squareFromName("B4"), weight: 1 },
    ];
    let seed = 42;
    for (let i = 0; i < 3; i++) {
      const [index, nextSeed] = drawWeightedIndex(
        seed,
        pool.map((entry) => entry.weight),
      );
      pool = pool.filter((_, poolIndex) => poolIndex !== index);
      seed = nextSeed;
    }
    expect(result.state.randomSeed).toBe(seed);
  });
});

describe("runChargeDraw — determinism", () => {
  it("produces the same drawn nodes from the same state and seed every time", () => {
    const state = buildState({
      randomSeed: 7,
      nodes: {
        F2: ["inactive", 1],
        J2: ["inactive", 1],
        B4: ["inactive", 1],
        H4: ["inactive", 1],
      },
    });

    const first = runChargeDraw(state);
    const second = runChargeDraw(state);

    expect(second).toEqual(first);
  });

  it("produces a different draw from a different seed, over a handful of seeds", () => {
    const nodes = {
      F2: ["inactive", 1],
      J2: ["inactive", 1],
      B4: ["inactive", 1],
      H4: ["inactive", 1],
    } as const;

    const results = [1, 2, 3, 4, 5].map((seed) =>
      runChargeDraw(buildState({ randomSeed: seed, nodes })),
    );

    const sequences = results.map((result) =>
      result.effects.map((effect) => squareName(effect.square)).join(","),
    );
    expect(new Set(sequences).size).toBeGreaterThan(1);
  });
});

describe("runChargeDraw — the pool", () => {
  it("never draws a depleted node, even when the board is short", () => {
    const state = buildState({
      nodes: {
        F2: ["depleted", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });

  it("draws an occupied inactive node like any other, charging it under the ship standing on it", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 3)],
      nodes: {
        F2: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("F2") },
    ]);
    expect(result.state.nodes.F2).toEqual({
      state: "charged",
      level: 0,
    });
    const occupant = result.state.ships.find((s) => s.id === "green-1");
    expect(occupant?.square).toEqual(squareFromName("F2"));
  });
});

describe("runChargeDraw — running short", () => {
  it("charges what the pool holds and stops, throwing nothing, when every node is charged or depleted elsewhere", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["depleted", 1],
        B4: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "node-charged", square: squareFromName("B4") },
    ]);
    expect(result.state.nodes.J2).toEqual({
      state: "depleted",
      level: 1,
    });

    const chargedCount = Object.values(result.state.nodes).filter(
      (status) => status.state === "charged",
    ).length;
    expect(chargedCount).toBeLessThan(TARGET_CHARGED_NODES);
  });

  it("climbs back to four, charging more than one node in a ply, once more inactive nodes become available", () => {
    const shortState = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["depleted", 1],
        B4: ["inactive", 1],
      },
    });
    const shortResult = runChargeDraw(shortState);
    const shortChargedCount = Object.values(shortResult.state.nodes).filter(
      (status) => status.state === "charged",
    ).length;
    expect(shortChargedCount).toBeLessThan(TARGET_CHARGED_NODES);

    // The following turn: two more nodes have gone inactive, enough to close
    // the gap the board was left short by above.
    const recoveredState: GameState = {
      ...shortResult.state,
      nodes: {
        ...shortResult.state.nodes,
        ...nodeStatuses({
          H4: ["inactive", 1],
          N4: ["inactive", 1],
        }),
      },
    };

    const recoveredResult = runChargeDraw(recoveredState);

    expect(recoveredResult.effects).toHaveLength(2);
    const recoveredChargedCount = Object.values(
      recoveredResult.state.nodes,
    ).filter((status) => status.state === "charged").length;
    expect(recoveredChargedCount).toBe(TARGET_CHARGED_NODES);
  });
});

describe("runChargeDraw — nothing to do", () => {
  it("charges nothing when the board is already at four", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result).toEqual({ state, effects: [] });
  });
});

describe("runChargeDraw — weighted by pressure (§8.2)", () => {
  it("draws a pressure-20 node about twice as often as a pressure-10 node, and still sometimes draws a pressure-1 node", () => {
    const counts: Record<string, number> = { N4: 0, D8: 0, H8: 0 };
    const TRIALS = 4000;
    for (let seed = 1; seed <= TRIALS; seed++) {
      const state = buildState({
        randomSeed: seed,
        nodes: {
          F2: ["charged", 1],
          J2: ["charged", 1],
          B4: ["charged", 1],
          N4: ["inactive", 20],
          D8: ["inactive", 10],
          H8: ["inactive", 1],
        },
      });

      const result = runChargeDraw(state);

      expect(result.effects).toHaveLength(1);
      const drawnName = squareName(result.effects[0].square);
      counts[drawnName] += 1;
    }

    const ratio = counts.N4 / counts.D8;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.5);
    expect(counts.H8).toBeGreaterThan(0);
  });

  it("draws several nodes without replacement, each draw weighted by the pressures still remaining", () => {
    const state = buildState({
      randomSeed: 99,
      nodes: {
        N4: ["inactive", 20],
        D8: ["inactive", 10],
        H8: ["inactive", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toHaveLength(3);
    const drawnNames = result.effects.map((effect) =>
      squareName(effect.square),
    );
    expect(new Set(drawnNames).size).toBe(3);

    // Replaying by hand with the weighted primitive, one at a time without
    // replacement, reaches the same final seed as the actual draw — the
    // remaining weights after each removal are the remaining nodes'
    // pressures, not a fresh uniform pool.
    let pool = [
      { square: squareFromName("N4"), weight: 20 },
      { square: squareFromName("D8"), weight: 10 },
      { square: squareFromName("H8"), weight: 1 },
    ];
    let seed = 99;
    for (let i = 0; i < 3; i++) {
      const [index, nextSeed] = drawWeightedIndex(
        seed,
        pool.map((entry) => entry.weight),
      );
      pool = pool.filter((_, poolIndex) => poolIndex !== index);
      seed = nextSeed;
    }
    expect(result.state.randomSeed).toBe(seed);
  });

  it("charges a node at level 0 regardless of the pressure it carried, discarding it", () => {
    const state = buildState({
      nodes: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        N4: ["inactive", 37],
      },
    });

    const result = runChargeDraw(state);

    expect(result.state.nodes.N4).toEqual({
      state: "charged",
      level: 0,
    });
  });
});
