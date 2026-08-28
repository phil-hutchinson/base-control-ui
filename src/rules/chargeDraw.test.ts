import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { runChargeDraw } from "./chargeDraw";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { drawIndex } from "./random";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";
import { strandedShipIds } from "./stranded";

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
    Object.entries(states).map(([name, [state, enteredOnPly]]) => [
      name,
      { state, enteredOnPly },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, readonly [SiteState, number]>>;
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 5,
    randomSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("runChargeDraw — the shortfall (§8.2, §8.6 step 4)", () => {
  it("charges one when four are charged and one is active", () => {
    const state = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
        N4: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "site-charged", square: squareFromName("N4") },
    ]);
    expect(result.state.siteStates.N4).toEqual({
      state: "charged",
      enteredOnPly: 5,
    });
  });

  it("charges three when two are charged and exactly three are active", () => {
    const state = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["active", 0],
        H4: ["active", 0],
        N4: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toHaveLength(3);
    const drawnNames = result.effects
      .map((effect) => squareName(effect.square))
      .sort();
    expect(drawnNames).toEqual(["B4", "H4", "N4"]);
    for (const name of ["B4", "H4", "N4"]) {
      expect(result.state.siteStates[name]).toEqual({
        state: "charged",
        enteredOnPly: 5,
      });
    }
  });

  it("charges nothing and leaves the seed untouched when five are already charged", () => {
    const state = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
        N4: ["charged", 1],
        K5: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });
});

describe("runChargeDraw — without replacement", () => {
  it("draws distinct sites, advancing the seed once per site charged", () => {
    const state = buildState({
      randomSeed: 42,
      siteStates: {
        F2: ["active", 0],
        J2: ["active", 0],
        B4: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toHaveLength(3);
    const drawnNames = result.effects.map((effect) =>
      squareName(effect.square),
    );
    expect(new Set(drawnNames).size).toBe(3);

    // Replaying the same draw by hand, one at a time without replacement,
    // reaches the same final seed — confirming the seed truly advances once
    // per site charged and not, for instance, once per candidate considered.
    let pool = [
      squareFromName("F2"),
      squareFromName("J2"),
      squareFromName("B4"),
    ];
    let seed = 42;
    for (let i = 0; i < 3; i++) {
      const [index, nextSeed] = drawIndex(seed, pool.length);
      pool = pool.filter((_, poolIndex) => poolIndex !== index);
      seed = nextSeed;
    }
    expect(result.state.randomSeed).toBe(seed);
  });
});

describe("runChargeDraw — determinism", () => {
  it("produces the same drawn sites from the same state and seed every time", () => {
    const state = buildState({
      randomSeed: 7,
      siteStates: {
        F2: ["active", 0],
        J2: ["active", 0],
        B4: ["active", 0],
        H4: ["active", 0],
      },
    });

    const first = runChargeDraw(state);
    const second = runChargeDraw(state);

    expect(second).toEqual(first);
  });

  it("produces a different draw from a different seed, over a handful of seeds", () => {
    const siteStates = {
      F2: ["active", 0],
      J2: ["active", 0],
      B4: ["active", 0],
      H4: ["active", 0],
    } as const;

    const results = [1, 2, 3, 4, 5].map((seed) =>
      runChargeDraw(buildState({ randomSeed: seed, siteStates })),
    );

    const sequences = results.map((result) =>
      result.effects.map((effect) => squareName(effect.square)).join(","),
    );
    expect(new Set(sequences).size).toBeGreaterThan(1);
  });
});

describe("runChargeDraw — the pool", () => {
  it("never draws a dormant site, even when the board is short", () => {
    const state = buildState({
      siteStates: {
        F2: ["dormant", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([]);
    expect(result.state).toEqual(state);
  });

  it("draws an occupied active site like any other, charging it under the ship standing on it", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 1)],
      siteStates: {
        F2: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "site-charged", square: squareFromName("F2") },
    ]);
    expect(result.state.siteStates.F2).toEqual({
      state: "charged",
      enteredOnPly: 5,
    });
    const occupant = result.state.ships.find((s) => s.id === "green-1");
    expect(occupant?.square).toEqual(squareFromName("F2"));
    expect(strandedShipIds(result.state)).not.toContain("green-1");
  });
});

describe("runChargeDraw — running short", () => {
  it("charges what the pool holds and stops, throwing nothing, when every site is charged or dormant elsewhere", () => {
    const state = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["dormant", 1],
        B4: ["active", 0],
      },
    });

    const result = runChargeDraw(state);

    expect(result.effects).toEqual([
      { type: "site-charged", square: squareFromName("B4") },
    ]);
    expect(result.state.siteStates.J2).toEqual({
      state: "dormant",
      enteredOnPly: 1,
    });

    const chargedCount = Object.values(result.state.siteStates).filter(
      (status) => status.state === "charged",
    ).length;
    expect(chargedCount).toBeLessThan(5);
  });

  it("climbs back to five, charging more than one site in a ply, once more active sites become available", () => {
    const shortState = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["dormant", 1],
        B4: ["active", 0],
      },
    });
    const shortResult = runChargeDraw(shortState);
    const shortChargedCount = Object.values(
      shortResult.state.siteStates,
    ).filter((status) => status.state === "charged").length;
    expect(shortChargedCount).toBeLessThan(5);

    // The following turn: three more sites have gone active, enough to
    // close the gap the board was left short by above.
    const recoveredState: GameState = {
      ...shortResult.state,
      siteStates: {
        ...shortResult.state.siteStates,
        ...siteStatuses({
          H4: ["active", 0],
          N4: ["active", 0],
          D8: ["active", 0],
        }),
      },
    };

    const recoveredResult = runChargeDraw(recoveredState);

    expect(recoveredResult.effects).toHaveLength(3);
    const recoveredChargedCount = Object.values(
      recoveredResult.state.siteStates,
    ).filter((status) => status.state === "charged").length;
    expect(recoveredChargedCount).toBe(5);
  });
});

describe("runChargeDraw — nothing to do", () => {
  it("charges nothing when the board is already at five", () => {
    const state = buildState({
      siteStates: {
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        H4: ["charged", 1],
        N4: ["charged", 1],
      },
    });

    const result = runChargeDraw(state);

    expect(result).toEqual({ state, effects: [] });
  });
});
