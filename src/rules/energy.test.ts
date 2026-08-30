import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import {
  chargedNodesHeldBy,
  dormantSitesOccupiedBy,
  energyForDormantSites,
  energyForNodesHeld,
} from "./energy";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { ShieldCount } from "./shields";
import { SITES, type SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, SiteState>>;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("energyForNodesHeld", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 6],
    [4, 10],
    [5, 15],
  ])("pays %i for holding %i nodes", (nodesHeld, energy) => {
    expect(energyForNodesHeld(nodesHeld)).toBe(energy);
  });

  it("throws for a negative count", () => {
    expect(() => energyForNodesHeld(-1)).toThrow(RangeError);
  });

  it("throws for a count above five", () => {
    expect(() => energyForNodesHeld(6)).toThrow(RangeError);
  });

  it("throws for a fractional count", () => {
    expect(() => energyForNodesHeld(2.5)).toThrow(RangeError);
  });
});

describe("chargedNodesHeldBy", () => {
  it("counts a ship standing on a charged node", () => {
    const state = buildState({
      siteStates: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([squareFromName("H8")]);
  });

  it("does not count a ship on an active site", () => {
    const state = buildState({
      siteStates: { H8: "active" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("does not count a ship on a dormant site", () => {
    const state = buildState({
      siteStates: { H8: "dormant" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("does not count an enemy ship on a charged node for this side", () => {
    const state = buildState({
      siteStates: { H8: "charged" },
      ships: [ship("red-1", "red", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("counts two ships of the same side on two charged nodes, in SITES order", () => {
    const state = buildState({
      siteStates: { L8: "charged", D8: "charged" },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    const d8Index = SITES.findIndex(
      (square) => square.column === "D" && square.row === 8,
    );
    const l8Index = SITES.findIndex(
      (square) => square.column === "L" && square.row === 8,
    );
    expect(d8Index).toBeLessThan(l8Index);

    expect(chargedNodesHeldBy(state, "green")).toEqual([
      squareFromName("D8"),
      squareFromName("L8"),
    ]);
  });

  it("returns an empty list for a side with no ships on any node", () => {
    const state = buildState({
      siteStates: { H8: "charged" },
      ships: [ship("green-1", "green", "D2")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });
});

describe("energyForDormantSites", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 6],
    [4, 10],
    [5, 15],
  ])("costs %i for standing on %i dormant sites", (dormantSites, energy) => {
    expect(energyForDormantSites(dormantSites)).toBe(energy);
  });

  it.each([6, 7])(
    "clamps %i dormant sites to the same price as five, without throwing",
    (dormantSites) => {
      expect(energyForDormantSites(dormantSites)).toBe(15);
    },
  );

  it("throws for a negative count", () => {
    expect(() => energyForDormantSites(-1)).toThrow(RangeError);
  });

  it("throws for a fractional count", () => {
    expect(() => energyForDormantSites(2.5)).toThrow(RangeError);
  });

  it("throws for a count above the number of ships a side has", () => {
    expect(() => energyForDormantSites(8)).toThrow(RangeError);
  });

  it("prices seven dormant sites the same as five, without throwing — the bound is the maximum fleet, not the current game's", () => {
    expect(energyForDormantSites(7)).toBe(15);
    expect(energyForDormantSites(7)).toBe(energyForDormantSites(5));
    expect(() => energyForDormantSites(8)).toThrow(RangeError);
  });
});

describe("dormantSitesOccupiedBy", () => {
  it("counts a ship standing on a dormant site", () => {
    const state = buildState({
      siteStates: { H8: "dormant" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([
      squareFromName("H8"),
    ]);
  });

  it("does not count a ship on an active site", () => {
    const state = buildState({
      siteStates: { H8: "active" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([]);
  });

  it("does not count a ship on a charged node", () => {
    const state = buildState({
      siteStates: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([]);
  });

  it("does not count an enemy ship on a dormant site for this side", () => {
    const state = buildState({
      siteStates: { H8: "dormant" },
      ships: [ship("red-1", "red", "H8")],
    });

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([]);
  });

  it("counts two ships of the same side on two dormant sites, in SITES order", () => {
    const state = buildState({
      siteStates: { L8: "dormant", D8: "dormant" },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    const d8Index = SITES.findIndex(
      (square) => square.column === "D" && square.row === 8,
    );
    const l8Index = SITES.findIndex(
      (square) => square.column === "L" && square.row === 8,
    );
    expect(d8Index).toBeLessThan(l8Index);

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([
      squareFromName("D8"),
      squareFromName("L8"),
    ]);
  });

  it("returns an empty list for a side standing on no dormant site", () => {
    const state = buildState({
      siteStates: { H8: "dormant" },
      ships: [ship("green-1", "green", "D2")],
    });

    expect(dormantSitesOccupiedBy(state, "green")).toEqual([]);
  });
});
