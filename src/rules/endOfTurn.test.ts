import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import type { ShipId } from "./fleet";
import {
  type GameState,
  type Ship,
  type NodeStatus,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyPassGuard } from "./ply";
import type { PowerLevel } from "./power";
import { NODE_CAPACITY, PRESSURE_CAP, type NodeState } from "./nodes";

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
  sideToMove?: "green" | "red";
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("runEndOfTurn — step 1, the power loss (§4.1)", () => {
  it("loses a point of power only for the moving side's ships standing on a charged node", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 1],
        K5: ["inactive", 1],
        L8: ["charged", 1],
        E11: ["charged", 1],
        H12: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 3), // charged: loses, 3 -> 2
        ship("green-2", "green", "K5", 3), // inactive: loses nothing
        ship("green-3", "green", "D2", 3), // not a node: loses nothing
        ship("green-4", "green", "L8", 0), // already at the floor: loses nothing
        ship("green-5", "green", "H12", 4), // charged: loses, 4 -> 3
        ship("red-1", "red", "E11", 3), // charged, but not the mover
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(2);
    expect(shipPower("green-2")).toBe(3);
    expect(shipPower("green-3")).toBe(3);
    expect(shipPower("green-4")).toBe(0);
    expect(shipPower("green-5")).toBe(3);
    expect(shipPower("red-1")).toBe(3);

    expect(result.effects.slice(0, 3)).toEqual([
      {
        type: "power-lost",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        power: 2,
      },
      {
        type: "power-lost",
        shipId: "green-5",
        side: "green",
        square: squareFromName("H12"),
        power: 3,
      },
      {
        type: "energy-collected",
        side: "green",
        amount: 6,
        newTotal: 6,
        squares: [
          squareFromName("H8"),
          squareFromName("L8"),
          squareFromName("H12"),
        ],
      },
    ]);
    // Step 4: the board is one node short of five, and K5 is the only
    // inactive node, so it is charged deterministically — the draw needs no
    // choice among a pool of one. Every charged node's level is small (1),
    // so step 3's drain draw never reaches capacity and adds no effect of
    // its own.
    expect(result.effects).toContainEqual({
      type: "node-charged",
      square: squareFromName("K5"),
    });
  });
});

describe("runEndOfTurn — step 1, the power gain (§4.1)", () => {
  it("gains a point of power only for the moving side's ships standing on a depleted node", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["depleted", 1],
        K5: ["inactive", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 2), // depleted: gains, 2 -> 3
        ship("green-2", "green", "K5", 2), // inactive: gains nothing
        ship("green-3", "green", "D2", 2), // not a node: gains nothing
        ship("red-1", "red", "H8", 2), // depleted, but not the mover
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(3);
    expect(shipPower("green-2")).toBe(2);
    expect(shipPower("green-3")).toBe(2);
    expect(shipPower("red-1")).toBe(2);

    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      power: 3,
    });
    expect(
      result.effects.filter((e) => e.type === "power-gained"),
    ).toHaveLength(1);
  });

  it("leaves a ship already at 4 power on a depleted node at 4 and raises no effect for it", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["depleted", 1] },
      ships: [ship("green-1", "green", "H8", 4)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(4);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("reports both a gain and a loss when one ship holds a node while another sits on a depleted node", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 1],
        K5: ["depleted", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "K5", 2),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "power-lost",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      power: 2,
    });
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-2",
      side: "green",
      square: squareFromName("K5"),
      power: 3,
    });
  });
});

describe("runEndOfTurn — step 1, the bay gain (§3.1, §4.1)", () => {
  it("gains a point of power for a ship standing in a bay at the end of its owner's turn", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", "A2", 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(3);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName("A2"),
      power: 3,
    });
  });

  it("leaves a ship already at 4 power in a bay at 4 and raises no effect for it", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", "A2", 4)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(4);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("collects and pays no energy for a ship recovering in a bay", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", "A2", 2)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("gains nothing for a ship of the other side sitting in a bay this turn", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("red-1", "red", "A2", 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "red-1")?.power).toBe(2);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("reports both a gain and a loss when one ship recovers in a bay while another holds a node", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [
        ship("green-1", "green", "A2", 2),
        ship("green-2", "green", "H8", 3),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName("A2"),
      power: 3,
    });
    expect(result.effects).toContainEqual({
      type: "power-lost",
      shipId: "green-2",
      side: "green",
      square: squareFromName("H8"),
      power: 2,
    });
    const gainIndex = result.effects.findIndex(
      (effect) => effect.type === "power-gained",
    );
    const lossIndex = result.effects.findIndex(
      (effect) => effect.type === "power-lost",
    );
    expect(gainIndex).toBeLessThan(lossIndex);
  });
});

describe("runEndOfTurn — step 3, drain (§8.3)", () => {
  it("rises an empty node's drain by 1, 2 or 3, and never anything else", () => {
    const observed = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const state = buildState({
        nodes: { H8: ["charged", 0] },
        randomSeed: seed,
      });
      const result = runEndOfTurn(state);
      const level = result.state.nodes.H8.level;
      expect([1, 2, 3]).toContain(level);
      observed.add(level);
    }
    expect(observed).toEqual(new Set([1, 2, 3]));
  });

  it("rises a held node's drain by 3, 4, 5 or 6, and never anything else, whichever side the ship belongs to", () => {
    for (const side of ["green", "red"] as const) {
      const observed = new Set<number>();
      for (let seed = 1; seed <= 300; seed++) {
        const state = buildState({
          nodes: { H8: ["charged", 0] },
          ships: [ship("ship-1", side, "H8", 4)],
          randomSeed: seed,
        });
        const result = runEndOfTurn(state);
        const level = result.state.nodes.H8.level;
        expect([3, 4, 5, 6]).toContain(level);
        observed.add(level);
      }
      expect(observed).toEqual(new Set([3, 4, 5, 6]));
    }
  });

  it("goes depleted, carrying its level unclamped, once drain reaches or passes capacity, leaving a ship on it untouched (§8.5)", () => {
    // Any drawn amount (empty table's minimum is 1) crosses capacity from
    // NODE_CAPACITY - 1, so this is deterministic without pinning a seed.
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(result.state.nodes.H8.level).toBeGreaterThanOrEqual(NODE_CAPACITY);
    expect(result.effects).toEqual([
      {
        type: "power-lost",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        power: 0,
      },
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("H8")],
      },
      { type: "node-ran-out", square: squareFromName("H8") },
    ]);
    // Step 1 takes a point of power from green's own ship for standing on a
    // charged node before step 3 spends the node — 1 falls to 0 first, then
    // the node runs out from under it, and the ship simply stays there.
    const untouchedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(untouchedShip?.power).toBe(0);
    expect(untouchedShip?.square).toEqual(squareFromName("H8"));
  });

  it("goes depleted with nothing further to report when the node was empty", () => {
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(result.effects).toEqual([
      { type: "node-ran-out", square: squareFromName("H8") },
    ]);
  });

  it("stays charged, unaffected, when drain is nowhere near capacity", () => {
    const state = buildState({
      nodes: { H8: ["charged", 0] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("charged");
    expect(
      result.effects.some((effect) => effect.type === "node-ran-out"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — lifetimes (§8.3)", () => {
  /** Drives a single charged node from `startLevel` until it goes depleted, counting plies. */
  function pliesUntilDepleted(
    startLevel: number,
    seed: number,
    held: boolean,
  ): number {
    let state = buildState({
      nodes: { H8: ["charged", startLevel] },
      ships: held ? [ship("green-1", "green", "H8", 4)] : [],
      randomSeed: seed,
    });
    let plies = 0;
    for (;;) {
      const result = runEndOfTurn(state);
      plies += 1;
      if (result.state.nodes.H8.state === "depleted") {
        return plies;
      }
      state = result.state;
    }
  }

  it("holds a node from the ply it is charged for about 13 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDepleted(0, seed, true), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(9);
    expect(average).toBeLessThan(17);
  });

  it("leaves a node nobody visits running for about 28 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDepleted(0, seed, false), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(21);
    expect(average).toBeLessThan(36);
  });
});

describe("runEndOfTurn — step 6, recovery (§8.2)", () => {
  it("recovers a depleted node to inactive, at pressure 1, once its level reaches zero or below", () => {
    // The recovery table's minimum draw is 4, so a level of 4 is guaranteed
    // to reach zero or below on a single draw, regardless of seed.
    const state = buildState({
      nodes: { H8: ["depleted", 4] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({ state: "inactive", level: 1 });
    expect(result.effects).toEqual([
      { type: "node-went-inactive", square: squareFromName("H8") },
    ]);
  });

  it("does not recover a node that only went depleted during this very sequence", () => {
    // H8's level guarantees it crosses capacity in step 3 (see the drain
    // tests above): it is genuinely `charged`, not `depleted`, at the start
    // of this state, so `runEndOfTurn` derives an empty depleted-before-ply
    // set on its own and step 6 must not touch H8 even though it is
    // depleted by the time step 6 runs.
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(
      result.effects.some((effect) => effect.type === "node-went-inactive"),
    ).toBe(false);
    // It first recovers at the end of the next ply, once it truly was
    // depleted when that one began — `result.state` genuinely has H8
    // depleted, so this second call derives it into the set on its own.
    const nextResult = runEndOfTurn(result.state);
    expect(nextResult.state.nodes.H8.level).toBeLessThan(
      result.state.nodes.H8.level,
    );
  });

  it("recovers a node ended at half capacity in roughly half the plies a full one takes", () => {
    function pliesToRecover(startLevel: number, seed: number): number {
      let state = buildState({
        nodes: { H8: ["depleted", startLevel] },
        randomSeed: seed,
      });
      let plies = 0;
      for (;;) {
        const result = runEndOfTurn(state);
        plies += 1;
        if (result.state.nodes.H8.state === "inactive") {
          return plies;
        }
        state = result.state;
      }
    }

    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const averageHalf =
      SEEDS.reduce((sum, seed) => sum + pliesToRecover(30, seed), 0) /
      SEEDS.length;
    const averageFull =
      SEEDS.reduce((sum, seed) => sum + pliesToRecover(60, seed), 0) /
      SEEDS.length;

    expect(averageHalf).toBeGreaterThan(averageFull * 0.3);
    expect(averageHalf).toBeLessThan(averageFull * 0.7);
  });
});

describe("runEndOfTurn — step 4, the charge draw never charges a node that went inactive in the same sequence (§8.6 step ordering)", () => {
  it("leaves the board with nothing charged when the only inactive candidate finishes recovering this very ply", () => {
    // H8 is guaranteed to recover this ply (level 4, see above); F2 is
    // guaranteed to run out this ply (level NODE_CAPACITY - 1, empty). H8 is
    // genuinely depleted, and F2 genuinely charged, before this ply begins,
    // so `runEndOfTurn` derives the right depleted-before-ply set on its own.
    const state = buildState({
      nodes: {
        H8: ["depleted", 4],
        F2: ["charged", NODE_CAPACITY - 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({ state: "inactive", level: 1 });
    expect(result.state.nodes.F2.state).toBe("depleted");
    expect(result.effects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("F2"),
    });
    expect(result.effects).toContainEqual({
      type: "node-went-inactive",
      square: squareFromName("H8"),
    });
    expect(
      result.effects.some((effect) => effect.type === "node-charged"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 5, pressure (§8.2)", () => {
  it("gains a point of pressure every ply it stays inactive", () => {
    // Five other nodes are already charged so the board is not short and
    // H8 cannot itself be drawn by step 4 — this isolates step 5.
    const state = buildState({
      nodes: {
        H8: ["inactive", 10],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
        D8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({
      state: "inactive",
      level: 11,
    });
  });

  it("stops at the pressure cap and never exceeds it", () => {
    const state = buildState({
      nodes: {
        H8: ["inactive", PRESSURE_CAP],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
        D8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({
      state: "inactive",
      level: PRESSURE_CAP,
    });
  });
});

describe("runEndOfTurn — step 2, the energy collection (§8.4)", () => {
  it("emits no effect and leaves both totals unchanged when nothing is held", () => {
    // Depleted rather than inactive, so step 4's charge draw has no pool to
    // draw these two from and this stays a pure test of step 2 alone.
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["depleted", 0], K5: ["depleted", 0] },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.filter((effect) => effect.type !== "node-went-inactive"),
    ).toEqual([]);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("pays the side that just played and leaves the other side's total untouched", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
  });

  it("pays for three held nodes, carrying the count, the amount, the new total and the squares", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 1],
        K5: ["charged", 1],
        L8: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "K5", 0),
        ship("green-3", "green", "L8", 0),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 6,
      newTotal: 6,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 6, red: 0 });
  });

  it("pays for a node whose drain reaches capacity at the end of this very turn (before step 3 ticks)", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
    expect(result.state.nodes.H8.state).toBe("depleted");
  });

  it("is unaffected by a ship losing its last point of power in step 1", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    const powerEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "power-lost",
    );
    const energyEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "energy-collected",
    );
    expect(powerEffectIndex).toBeGreaterThanOrEqual(0);
    expect(powerEffectIndex).toBeLessThan(energyEffectIndex);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const ship1 = result.state.ships.find((s) => s.id === "green-1");
    expect(ship1?.power).toBe(0);
  });

  it("pays this side nothing for a node held by the opponent", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("red-1", "red", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });
});

describe("runEndOfTurn — step 2, the energy penalty (§8.4)", () => {
  it("prices one, two, three, four and five depleted nodes off the collection table", () => {
    const cases: readonly [number, number][] = [
      [1, 1],
      [2, 3],
      [3, 6],
      [4, 10],
      [5, 15],
    ];
    for (const [depletedCount, expectedAmount] of cases) {
      const names = ["H8", "K5", "L8", "D8", "K11"].slice(0, depletedCount);
      const state = {
        ...buildState({
          sideToMove: "green",
          nodes: Object.fromEntries(
            names.map((name) => [name, ["depleted", 0] as const]),
          ),
          ships: names.map((name, index) =>
            ship(`green-${index + 1}` as ShipId, "green", name, 0),
          ),
        }),
        energy: { green: 100, red: 0 },
      };

      const result = runEndOfTurn(state);

      const penalty = result.effects.find(
        (effect) => effect.type === "energy-penalty",
      );
      expect(penalty).toMatchObject({
        type: "energy-penalty",
        side: "green",
        amount: expectedAmount,
        newTotal: 100 - expectedAmount,
      });
      expect(result.state.energy.green).toBe(100 - expectedAmount);
    }
  });

  it("prices six and seven depleted nodes the same as five, raising no error", () => {
    const sixNames = ["H8", "K5", "L8", "D8", "K11", "E5"];
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: Object.fromEntries(
          sixNames.map((name) => [name, ["depleted", 0] as const]),
        ),
        ships: sixNames.map((name, index) =>
          ship(`green-${index + 1}` as ShipId, "green", name, 0),
        ),
      }),
      energy: { green: 100, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual(
      expect.objectContaining({ type: "energy-penalty", amount: 15 }),
    );
    expect(result.state.energy.green).toBe(85);
  });

  it("collects for the charged nodes held and then pays for the depleted nodes occupied, not netted", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: {
          H8: ["charged", 1],
          K5: ["charged", 1],
          L8: ["charged", 1],
          D8: ["depleted", 0],
          K11: ["depleted", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("green-2", "green", "K5", 0),
          ship("green-3", "green", "L8", 0),
          ship("green-4", "green", "D8", 4),
          ship("green-5", "green", "K11", 4),
        ],
      }),
      energy: { green: 0, red: 0 },
    };

    const result = runEndOfTurn(state);

    const collectedIndex = result.effects.findIndex(
      (effect) => effect.type === "energy-collected",
    );
    const penaltyIndex = result.effects.findIndex(
      (effect) => effect.type === "energy-penalty",
    );
    expect(collectedIndex).toBeGreaterThanOrEqual(0);
    expect(penaltyIndex).toBeGreaterThan(collectedIndex);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 6,
      newTotal: 6,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.effects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 3,
      newTotal: 3,
      squares: [squareFromName("D8"), squareFromName("K11")],
    });
    expect(result.state.energy.green).toBe(3);
  });

  it("floors a penalty larger than the side's energy at 0, reporting only what was actually deducted", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: {
          H8: ["depleted", 0],
          K5: ["depleted", 0],
          L8: ["depleted", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 4),
          ship("green-2", "green", "K5", 4),
          ship("green-3", "green", "L8", 4),
        ],
      }),
      energy: { green: 2, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 2,
      newTotal: 0,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy.green).toBe(0);
  });

  it("raises no penalty effect for a side with 0 energy standing on depleted nodes", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { H8: ["depleted", 0] },
        ships: [ship("green-1", "green", "H8", 4)],
      }),
      energy: { green: 0, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy.green).toBe(0);
  });

  it("raises no penalty effect for a side standing on no depleted node", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { H8: ["inactive", 1] },
        ships: [ship("green-1", "green", "H8", 0)],
      }),
      energy: { green: 5, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy.green).toBe(5);
  });

  it("costs this side nothing for a depleted node occupied by the opponent", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { H8: ["depleted", 0] },
        ships: [ship("red-1", "red", "H8", 0)],
      }),
      energy: { green: 5, red: 5 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 5, red: 5 });
  });

  it("prices the depleted node occupied and ignores one with no ship standing on it", () => {
    // green-1 ends on H8, depleted: it pays for that. K5, also depleted, is
    // never occupied at all here, so it never counts — a node with no ship
    // standing on it at the moment the count is taken costs nothing,
    // regardless of why. (`camping.test.ts` carries the genuine fly-over
    // case, driven through movement.)
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { H8: ["depleted", 0], K5: ["depleted", 0] },
        ships: [ship("green-1", "green", "H8", 0)],
      }),
      energy: { green: 5, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 1,
      newTotal: 4,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy.green).toBe(4);
  });
});

describe("runEndOfTurn — a passed ply still settles both directions in full (§8.6 runs in full for a pass)", () => {
  it("pays the side that passes while standing on a charged node, through applyPassGuard", () => {
    // green-1 sits on K5, a charged node, having already acted this ply: it
    // has no move left (already acted) and no enemy stands anywhere near it
    // to attack, so it passes — but §8.6 still runs in full for that passed
    // turn, and green is still standing on the node.
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { K5: ["charged", 1] },
        ships: [ship("green-1", "green", "K5", 1)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    expect(result.effect?.endOfTurn.slice(0, 2)).toEqual([
      {
        type: "power-lost",
        shipId: "green-1",
        side: "green",
        square: squareFromName("K5"),
        power: 0,
      },
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("K5")],
      },
    ]);
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
  });

  it("pays the side that passes while standing on a depleted node, through applyPassGuard", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { K5: ["depleted", 0] },
        ships: [ship("green-1", "green", "K5", 1)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
      energy: { green: 5, red: 0 },
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    expect(result.effect?.endOfTurn).toContainEqual({
      type: "energy-penalty",
      side: "green",
      amount: 1,
      newTotal: 4,
      squares: [squareFromName("K5")],
    });
    expect(result.state.energy).toEqual({ green: 4, red: 0 });
  });
});

describe("runEndOfTurn — the opening board does not fall into lockstep (§8.1)", () => {
  it("does not run all five opening nodes out on the same ply", () => {
    const SEEDS = [20260828, 20260829, 20260830, 20260831, 20260832];
    const PLIES_TO_RUN = 60;

    for (const seed of SEEDS) {
      let state = startingGameState(seed, DEFAULT_GAME_LENGTH_ROUNDS);
      // Whichever nodes the game opened with, not a fixed list.
      const openingSquares = Object.keys(state.nodes).filter(
        (name) => state.nodes[name]?.state === "charged",
      );
      const runOutPly = new Map<string, number>();

      for (let ply = 1; ply <= PLIES_TO_RUN; ply++) {
        const result = runEndOfTurn(state);
        for (const effect of result.effects) {
          if (effect.type === "node-ran-out") {
            const name = squareName(effect.square);
            if (openingSquares.includes(name) && !runOutPly.has(name)) {
              runOutPly.set(name, ply);
            }
          }
        }
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }

      const plies = openingSquares
        .filter((name) => runOutPly.has(name))
        .map((name) => runOutPly.get(name));
      if (plies.length === openingSquares.length) {
        expect(new Set(plies).size).toBeGreaterThan(1);
      }
    }
  });
});
