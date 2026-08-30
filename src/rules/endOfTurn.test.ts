import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runEndOfTurn } from "./endOfTurn";
import type { ShipId } from "./fleet";
import {
  type GameState,
  type Ship,
  type SiteStatus,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyPassGuard } from "./ply";
import type { ShieldCount } from "./shields";
import { NODE_CAPACITY, PRESSURE_CAP, type SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, readonly [SiteState, number]>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, level]]) => [
      name,
      { state, level },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, readonly [SiteState, number]>>;
  sideToMove?: "green" | "red";
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("runEndOfTurn — step 1, the shield grant", () => {
  it("gains a shield only for the moving side's ships standing on a charged node", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: {
        H8: ["charged", 1],
        K5: ["active", 1],
        L8: ["charged", 1],
        E11: ["charged", 1],
        H12: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 1), // charged: gains, 1 -> 2
        ship("green-2", "green", "K5", 1), // active: gains nothing
        ship("green-3", "green", "D2", 1), // not a site: gains nothing
        ship("green-4", "green", "L8", 4), // already capped: gains nothing
        ship("green-5", "green", "H12", 0), // charged: gains, 0 -> 1
        ship("red-1", "red", "E11", 1), // charged, but not the mover
      ],
    });

    const result = runEndOfTurn(state);

    const shipShields = (id: ShipId): ShieldCount | undefined =>
      result.state.ships.find((s) => s.id === id)?.shields;

    expect(shipShields("green-1")).toBe(2);
    expect(shipShields("green-2")).toBe(1);
    expect(shipShields("green-3")).toBe(1);
    expect(shipShields("green-4")).toBe(4);
    expect(shipShields("green-5")).toBe(1);
    expect(shipShields("red-1")).toBe(1);

    expect(result.effects.slice(0, 3)).toEqual([
      {
        type: "shield-gained",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        shields: 2,
      },
      {
        type: "shield-gained",
        shipId: "green-5",
        side: "green",
        square: squareFromName("H12"),
        shields: 1,
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
    // active site, so it is charged deterministically — the draw needs no
    // choice among a pool of one. Every charged node's level is small (1),
    // so step 3's drain draw never reaches capacity and adds no effect of
    // its own.
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("K5"),
    });
  });
});

describe("runEndOfTurn — step 1, the shield loss (§4.1)", () => {
  it("loses a shield only for the moving side's ships standing on a dormant site", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: {
        H8: ["dormant", 1],
        K5: ["active", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 2), // dormant: loses, 2 -> 1
        ship("green-2", "green", "K5", 2), // active: loses nothing
        ship("green-3", "green", "D2", 2), // not a site: loses nothing
        ship("red-1", "red", "H8", 2), // dormant, but not the mover
      ],
    });

    const result = runEndOfTurn(state);

    const shipShields = (id: ShipId): ShieldCount | undefined =>
      result.state.ships.find((s) => s.id === id)?.shields;

    expect(shipShields("green-1")).toBe(1);
    expect(shipShields("green-2")).toBe(2);
    expect(shipShields("green-3")).toBe(2);
    expect(shipShields("red-1")).toBe(2);

    expect(result.effects).toContainEqual({
      type: "shield-lost",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      shields: 1,
    });
    expect(result.effects.filter((e) => e.type === "shield-lost")).toHaveLength(
      1,
    );
  });

  it("leaves a ship already on 0 shields at 0 and raises no effect for it", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: { H8: ["dormant", 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.shields).toBe(0);
    expect(result.effects.some((effect) => effect.type === "shield-lost")).toBe(
      false,
    );
  });

  it("reports both a gain and a loss when one ship holds a node while another sits on a dormant site", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: {
        H8: ["charged", 1],
        K5: ["dormant", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "K5", 2),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "shield-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      shields: 2,
    });
    expect(result.effects).toContainEqual({
      type: "shield-lost",
      shipId: "green-2",
      side: "green",
      square: squareFromName("K5"),
      shields: 1,
    });
  });
});

describe("runEndOfTurn — step 3, drain (§8.3)", () => {
  it("rises an empty node's drain by 1, 2 or 3, and never anything else", () => {
    const observed = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const state = buildState({
        siteStates: { H8: ["charged", 0] },
        randomSeed: seed,
      });
      const result = runEndOfTurn(state);
      const level = result.state.siteStates.H8.level;
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
          siteStates: { H8: ["charged", 0] },
          ships: [ship("ship-1", side, "H8", 0)],
          randomSeed: seed,
        });
        const result = runEndOfTurn(state);
        const level = result.state.siteStates.H8.level;
        expect([3, 4, 5, 6]).toContain(level);
        observed.add(level);
      }
      expect(observed).toEqual(new Set([3, 4, 5, 6]));
    }
  });

  it("goes dormant, carrying its level unclamped, once drain reaches or passes capacity, leaving a ship on it untouched (§8.5)", () => {
    // Any drawn amount (empty table's minimum is 1) crosses capacity from
    // NODE_CAPACITY - 1, so this is deterministic without pinning a seed.
    const state = buildState({
      siteStates: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8.state).toBe("dormant");
    expect(result.state.siteStates.H8.level).toBeGreaterThanOrEqual(
      NODE_CAPACITY,
    );
    expect(result.effects).toEqual([
      {
        type: "shield-gained",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
        shields: 4,
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
    // Step 1 grants green's own ship a shield for standing on a charged
    // node before step 3 spends the node — 3 rises to 4 first, then the
    // node runs out from under it, and the ship simply stays there.
    const untouchedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(untouchedShip?.shields).toBe(4);
    expect(untouchedShip?.square).toEqual(squareFromName("H8"));
  });

  it("goes dormant with nothing further to report when the node was empty", () => {
    const state = buildState({
      siteStates: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8.state).toBe("dormant");
    expect(result.effects).toEqual([
      { type: "node-ran-out", square: squareFromName("H8") },
    ]);
  });

  it("stays charged, unaffected, when drain is nowhere near capacity", () => {
    const state = buildState({
      siteStates: { H8: ["charged", 0] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8.state).toBe("charged");
    expect(
      result.effects.some((effect) => effect.type === "node-ran-out"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — lifetimes (§8.3)", () => {
  /** Drives a single charged node from `startLevel` until it goes dormant, counting plies. */
  function pliesUntilDormant(
    startLevel: number,
    seed: number,
    held: boolean,
  ): number {
    let state = buildState({
      siteStates: { H8: ["charged", startLevel] },
      ships: held ? [ship("green-1", "green", "H8", 0)] : [],
      randomSeed: seed,
    });
    let plies = 0;
    for (;;) {
      const result = runEndOfTurn(state);
      plies += 1;
      if (result.state.siteStates.H8.state === "dormant") {
        return plies;
      }
      state = result.state;
    }
  }

  it("holds a node from the ply it is charged for about 13 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDormant(0, seed, true), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(9);
    expect(average).toBeLessThan(17);
  });

  it("leaves a node nobody visits running for about 28 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDormant(0, seed, false), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(21);
    expect(average).toBeLessThan(36);
  });
});

describe("runEndOfTurn — step 6, recovery (§8.2)", () => {
  it("recovers a dormant site to active, at pressure 1, once its level reaches zero or below", () => {
    // The recovery table's minimum draw is 4, so a level of 4 is guaranteed
    // to reach zero or below on a single draw, regardless of seed.
    const state = buildState({
      siteStates: { H8: ["dormant", 4] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8).toEqual({ state: "active", level: 1 });
    expect(result.effects).toEqual([
      { type: "site-went-active", square: squareFromName("H8") },
    ]);
  });

  it("does not recover a site that only went dormant during this very sequence", () => {
    // H8's level guarantees it crosses capacity in step 3 (see the drain
    // tests above): it is genuinely `charged`, not `dormant`, at the start
    // of this state, so `runEndOfTurn` derives an empty dormant-before-ply
    // set on its own and step 6 must not touch H8 even though it is
    // dormant by the time step 6 runs.
    const state = buildState({
      siteStates: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8.state).toBe("dormant");
    expect(
      result.effects.some((effect) => effect.type === "site-went-active"),
    ).toBe(false);
    // It first recovers at the end of the next ply, once it truly was
    // dormant when that one began — `result.state` genuinely has H8
    // dormant, so this second call derives it into the set on its own.
    const nextResult = runEndOfTurn(result.state);
    expect(nextResult.state.siteStates.H8.level).toBeLessThan(
      result.state.siteStates.H8.level,
    );
  });

  it("recovers a site ended at half capacity in roughly half the plies a full one takes", () => {
    function pliesToRecover(startLevel: number, seed: number): number {
      let state = buildState({
        siteStates: { H8: ["dormant", startLevel] },
        randomSeed: seed,
      });
      let plies = 0;
      for (;;) {
        const result = runEndOfTurn(state);
        plies += 1;
        if (result.state.siteStates.H8.state === "active") {
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

describe("runEndOfTurn — step 4, the charge draw never charges a site that went active in the same sequence (§8.6 step ordering)", () => {
  it("leaves the board with nothing charged when the only active candidate finishes recovering this very ply", () => {
    // H8 is guaranteed to recover this ply (level 4, see above); F2 is
    // guaranteed to run out this ply (level NODE_CAPACITY - 1, empty). H8 is
    // genuinely dormant, and F2 genuinely charged, before this ply begins,
    // so `runEndOfTurn` derives the right dormant-before-ply set on its own.
    const state = buildState({
      siteStates: {
        H8: ["dormant", 4],
        F2: ["charged", NODE_CAPACITY - 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8).toEqual({ state: "active", level: 1 });
    expect(result.state.siteStates.F2.state).toBe("dormant");
    expect(result.effects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("F2"),
    });
    expect(result.effects).toContainEqual({
      type: "site-went-active",
      square: squareFromName("H8"),
    });
    expect(
      result.effects.some((effect) => effect.type === "site-charged"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 5, pressure (§8.2)", () => {
  it("gains a point of pressure every ply it stays active", () => {
    // Five other sites are already charged so the board is not short and
    // H8 cannot itself be drawn by step 4 — this isolates step 5.
    const state = buildState({
      siteStates: {
        H8: ["active", 10],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
        D8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8).toEqual({
      state: "active",
      level: 11,
    });
  });

  it("stops at the pressure cap and never exceeds it", () => {
    const state = buildState({
      siteStates: {
        H8: ["active", PRESSURE_CAP],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
        D8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.siteStates.H8).toEqual({
      state: "active",
      level: PRESSURE_CAP,
    });
  });
});

describe("runEndOfTurn — step 2, the energy collection (§8.4)", () => {
  it("emits no effect and leaves both totals unchanged when nothing is held", () => {
    // Dormant rather than active, so step 4's charge draw has no pool to
    // draw these two from and this stays a pure test of step 2 alone.
    const state = buildState({
      sideToMove: "green",
      siteStates: { H8: ["dormant", 0], K5: ["dormant", 0] },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.filter((effect) => effect.type !== "site-went-active"),
    ).toEqual([]);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("pays the side that just played and leaves the other side's total untouched", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 4)],
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
      siteStates: {
        H8: ["charged", 1],
        K5: ["charged", 1],
        L8: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 4),
        ship("green-2", "green", "K5", 4),
        ship("green-3", "green", "L8", 4),
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
      siteStates: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 4)],
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
    expect(result.state.siteStates.H8.state).toBe("dormant");
  });

  it("is unaffected by a ship gaining its fourth shield in step 1", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    const shieldEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "shield-gained",
    );
    const energyEffectIndex = result.effects.findIndex(
      (effect) => effect.type === "energy-collected",
    );
    expect(shieldEffectIndex).toBeGreaterThanOrEqual(0);
    expect(shieldEffectIndex).toBeLessThan(energyEffectIndex);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const ship1 = result.state.ships.find((s) => s.id === "green-1");
    expect(ship1?.shields).toBe(4);
  });

  it("pays this side nothing for a node held by the opponent", () => {
    const state = buildState({
      sideToMove: "green",
      siteStates: { H8: ["charged", 1] },
      ships: [ship("red-1", "red", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });
});

describe("runEndOfTurn — step 2, the energy penalty (§8.4)", () => {
  it("prices one, two, three, four and five dormant sites off the collection table", () => {
    const cases: readonly [number, number][] = [
      [1, 1],
      [2, 3],
      [3, 6],
      [4, 10],
      [5, 15],
    ];
    for (const [dormantCount, expectedAmount] of cases) {
      const names = ["H8", "K5", "L8", "D8", "K11"].slice(0, dormantCount);
      const state = {
        ...buildState({
          sideToMove: "green",
          siteStates: Object.fromEntries(
            names.map((name) => [name, ["dormant", 0] as const]),
          ),
          ships: names.map((name, index) =>
            ship(`green-${index + 1}` as ShipId, "green", name, 4),
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

  it("prices six and seven dormant sites the same as five, raising no error", () => {
    const sixNames = ["H8", "K5", "L8", "D8", "K11", "E5"];
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: Object.fromEntries(
          sixNames.map((name) => [name, ["dormant", 0] as const]),
        ),
        ships: sixNames.map((name, index) =>
          ship(`green-${index + 1}` as ShipId, "green", name, 4),
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

  it("collects for the charged nodes held and then pays for the dormant sites occupied, not netted", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: {
          H8: ["charged", 1],
          K5: ["charged", 1],
          L8: ["charged", 1],
          D8: ["dormant", 0],
          K11: ["dormant", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 4),
          ship("green-2", "green", "K5", 4),
          ship("green-3", "green", "L8", 4),
          ship("green-4", "green", "D8", 0),
          ship("green-5", "green", "K11", 0),
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
        siteStates: {
          H8: ["dormant", 0],
          K5: ["dormant", 0],
          L8: ["dormant", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("green-2", "green", "K5", 0),
          ship("green-3", "green", "L8", 0),
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

  it("raises no penalty effect for a side with 0 energy standing on dormant sites", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { H8: ["dormant", 0] },
        ships: [ship("green-1", "green", "H8", 0)],
      }),
      energy: { green: 0, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy.green).toBe(0);
  });

  it("raises no penalty effect for a side standing on no dormant site", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { H8: ["active", 1] },
        ships: [ship("green-1", "green", "H8", 4)],
      }),
      energy: { green: 5, red: 0 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy.green).toBe(5);
  });

  it("costs this side nothing for a dormant site occupied by the opponent", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { H8: ["dormant", 0] },
        ships: [ship("red-1", "red", "H8", 4)],
      }),
      energy: { green: 5, red: 5 },
    };

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-penalty"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 5, red: 5 });
  });

  it("prices the dormant site occupied and ignores one with no ship standing on it", () => {
    // green-1 ends on H8, dormant: it pays for that. K5, also dormant, is
    // never occupied at all here, so it never counts — a site with no ship
    // standing on it at the moment the count is taken costs nothing,
    // regardless of why. (`camping.test.ts` carries the genuine fly-over
    // case, driven through movement.)
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { H8: ["dormant", 0], K5: ["dormant", 0] },
        ships: [ship("green-1", "green", "H8", 4)],
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
    // green-1 sits on K5, a charged site, having already acted this ply: it
    // has no move left (already acted) and no enemy stands anywhere near it
    // to attack, so it passes — but §8.6 still runs in full for that passed
    // turn, and green is still standing on the node.
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { K5: ["charged", 1] },
        ships: [ship("green-1", "green", "K5", 3)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    expect(result.effect?.endOfTurn.slice(0, 2)).toEqual([
      {
        type: "shield-gained",
        shipId: "green-1",
        side: "green",
        square: squareFromName("K5"),
        shields: 4,
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

  it("pays the side that passes while standing on a dormant site, through applyPassGuard", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        siteStates: { K5: ["dormant", 0] },
        ships: [ship("green-1", "green", "K5", 3)],
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
    const OPENING_SQUARES = ["H8", "E5", "K5", "E11", "K11"];
    const SEEDS = [20260828, 20260829, 20260830, 20260831, 20260832];
    const PLIES_TO_RUN = 60;

    for (const seed of SEEDS) {
      let state = startingGameState(seed, DEFAULT_GAME_LENGTH_ROUNDS);
      const runOutPly = new Map<string, number>();

      for (let ply = 1; ply <= PLIES_TO_RUN; ply++) {
        const result = runEndOfTurn(state);
        for (const effect of result.effects) {
          if (effect.type === "node-ran-out") {
            const name = squareName(effect.square);
            if (OPENING_SQUARES.includes(name) && !runOutPly.has(name)) {
              runOutPly.set(name, ply);
            }
          }
        }
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }

      const plies = OPENING_SQUARES.filter((name) => runOutPly.has(name)).map(
        (name) => runOutPly.get(name),
      );
      if (plies.length === OPENING_SQUARES.length) {
        expect(new Set(plies).size).toBeGreaterThan(1);
      }
    }
  });
});
