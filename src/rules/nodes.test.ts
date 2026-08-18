import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import type { ReachEntry } from "./movement";
import {
  drawReplacements,
  type SiteCooledEffect,
  type SiteWokenEffect,
  wakeTouchedSites,
} from "./nodes";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, [SiteState, number]>>,
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
  siteStates?: Readonly<Record<string, [SiteState, number]>>;
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 2,
    movedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
  };
}

function path(
  destinationName: string,
  passedOverNames: readonly string[],
): ReachEntry {
  return {
    destination: squareFromName(destinationName),
    passedOver: passedOverNames.map(squareFromName),
  };
}

describe("wakeTouchedSites", () => {
  it("charges an active site the ship lands on, starting its clock on the current ply", () => {
    const state = buildState({
      siteStates: { K8: ["active", 0] },
      plyNumber: 7,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.K8).toEqual({
      state: "charged",
      enteredOnPly: 7,
    });
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("K8"),
        shipId: "green-1",
        side: "green",
        reach: "landed-on",
      },
    ]);
  });

  it("charges an active site the ship only flies over, without the ship stopping there", () => {
    const state = buildState({
      siteStates: { I8: ["active", 0] },
      plyNumber: 3,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.I8).toEqual({
      state: "charged",
      enteredOnPly: 3,
    });
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("I8"),
        shipId: "green-1",
        side: "green",
        reach: "flown-over",
      },
    ]);
  });

  it("wakes a site identically for either side's ship", () => {
    const state = buildState({
      siteStates: { K8: ["active", 0] },
      plyNumber: 4,
    });
    const mover = ship("red-1", "red", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates.K8.state).toBe("charged");
    expect(result.effects).toEqual([
      {
        type: "site-charged",
        square: squareFromName("K8"),
        shipId: "red-1",
        side: "red",
        reach: "landed-on",
      },
    ]);
  });

  it("leaves an already-charged site unchanged, without restarting its clock", () => {
    const state = buildState({
      siteStates: { K8: ["charged", 2] },
      plyNumber: 9,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("leaves dormant and depleted sites unaffected by a fly-over, with no effect", () => {
    const state = buildState({
      siteStates: { I8: ["dormant", 0], J8: ["depleted", 1] },
      plyNumber: 5,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });

  it("reports no effect and leaves siteStates deeply unchanged when no site is touched", () => {
    const state = buildState({
      siteStates: { B4: ["active", 0] },
      plyNumber: 2,
    });
    const mover = ship("green-1", "green", "H8");

    const result = wakeTouchedSites(state, mover, path("K8", ["I8", "J8"]));

    expect(result.state).toBe(state);
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).toEqual([]);
  });
});

describe("drawReplacements", () => {
  it("turns exactly one dormant site active, advances the seed, and reports one effect", () => {
    const state = buildState({
      siteStates: {
        B4: ["dormant", 0],
        H4: ["dormant", 0],
        K5: ["charged", 3],
        D8: ["depleted", 2],
      },
      plyNumber: 6,
      randomSeed: 0,
    });

    const result = drawReplacements(state, 1);

    expect(result.state.siteStates.B4).toEqual({
      state: "active",
      enteredOnPly: 6,
    });
    expect(result.state.siteStates.H4).toEqual({
      state: "dormant",
      enteredOnPly: 0,
    });
    expect(result.state.siteStates.K5).toEqual({
      state: "charged",
      enteredOnPly: 3,
    });
    expect(result.state.siteStates.D8).toEqual({
      state: "depleted",
      enteredOnPly: 2,
    });
    expect(result.state.randomSeed).not.toBe(state.randomSeed);
    expect(result.effects).toEqual([
      {
        type: "site-woken",
        square: squareFromName("B4"),
        wokeInto: "active",
      },
    ]);
  });

  it("is reproducible from the same state and seed, and different seeds can draw different sites", () => {
    const config = {
      siteStates: {
        B4: ["dormant", 0],
        H4: ["dormant", 0],
      } satisfies Readonly<Record<string, [SiteState, number]>>,
      plyNumber: 6,
    };

    const stateA = buildState({ ...config, randomSeed: 5 });
    const stateB = buildState({ ...config, randomSeed: 5 });
    expect(drawReplacements(stateA, 1)).toEqual(drawReplacements(stateB, 1));

    const seed0 = drawReplacements(buildState({ ...config, randomSeed: 0 }), 1);
    const seed1 = drawReplacements(buildState({ ...config, randomSeed: 1 }), 1);
    expect(seed0.effects[0]?.square).not.toEqual(seed1.effects[0]?.square);
  });

  it("only ever draws a site that was dormant beforehand", () => {
    const config = {
      siteStates: {
        F2: ["active", 0],
        B4: ["dormant", 0],
        H4: ["dormant", 0],
        K5: ["charged", 3],
        D8: ["depleted", 2],
      } satisfies Readonly<Record<string, [SiteState, number]>>,
      plyNumber: 6,
    };
    const dormantNames = new Set(["B4", "H4"]);

    const isSiteWoken = (
      effect: SiteWokenEffect | SiteCooledEffect,
    ): effect is SiteWokenEffect => effect.type === "site-woken";

    for (let seed = 0; seed < 50; seed++) {
      const state = buildState({ ...config, randomSeed: seed });
      const result = drawReplacements(state, 1);
      const woken = result.effects.find(isSiteWoken);
      expect(woken).toBeDefined();
      expect(dormantNames.has(squareName(woken!.square))).toBe(true);
    }
  });

  it("draws without replacement when several replacements are needed at once", () => {
    const state = buildState({
      siteStates: {
        B4: ["dormant", 0],
        H4: ["dormant", 0],
        N4: ["dormant", 0],
        E5: ["dormant", 0],
      },
      plyNumber: 6,
      randomSeed: 3,
    });

    const result = drawReplacements(state, 3);

    expect(result.effects).toHaveLength(3);
    const squares = result.effects.map((effect) => squareName(effect.square));
    expect(new Set(squares).size).toBe(3);

    const dormantCount = ["B4", "H4", "N4", "E5"].filter(
      (name) => result.state.siteStates[name]?.state === "dormant",
    ).length;
    const activeCount = ["B4", "H4", "N4", "E5"].filter(
      (name) => result.state.siteStates[name]?.state === "active",
    ).length;
    expect(dormantCount).toBe(1);
    expect(activeCount).toBe(3);
  });

  it("wakes charged, not active, when a ship is standing on the drawn site", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "B4")],
      siteStates: { B4: ["dormant", 0] },
      plyNumber: 9,
      randomSeed: 0,
    });

    const result = drawReplacements(state, 1);

    expect(result.state.siteStates.B4).toEqual({
      state: "charged",
      enteredOnPly: 9,
    });
    expect(result.effects).toEqual([
      {
        type: "site-woken",
        square: squareFromName("B4"),
        wokeInto: "charged",
      },
    ]);
  });

  it("returns the longest-depleted site to dormant first when the pool is empty, then draws", () => {
    const state = buildState({
      siteStates: {
        D8: ["depleted", 4],
        H8: ["depleted", 3],
        L8: ["depleted", 4],
      },
      plyNumber: 20,
      randomSeed: 0,
    });

    const result = drawReplacements(state, 1);

    expect(result.effects[0]).toEqual({
      type: "site-cooled",
      square: squareFromName("H8"),
    });
    expect(result.effects[1]).toEqual({
      type: "site-woken",
      square: squareFromName("H8"),
      wokeInto: "active",
    });
    expect(result.state.siteStates.H8).toEqual({
      state: "active",
      enteredOnPly: 20,
    });
    expect(result.state.siteStates.D8).toEqual({
      state: "depleted",
      enteredOnPly: 4,
    });
    expect(result.state.siteStates.L8).toEqual({
      state: "depleted",
      enteredOnPly: 4,
    });
  });

  it("breaks a tie for longest-depleted by SITES order", () => {
    const state = buildState({
      siteStates: {
        D8: ["depleted", 4],
        L8: ["depleted", 4],
      },
      plyNumber: 20,
      randomSeed: 0,
    });

    const result = drawReplacements(state, 1);

    expect(result.effects[0]).toEqual({
      type: "site-cooled",
      square: squareFromName("D8"),
    });
  });

  it("throws when there is no dormant or depleted site to draw from", () => {
    const state = buildState({
      siteStates: {
        F2: ["active", 0],
        J2: ["charged", 1],
      },
      plyNumber: 6,
      randomSeed: 0,
    });

    expect(() => drawReplacements(state, 1)).toThrow();
  });
});
