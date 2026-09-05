import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareFromName } from "./board";
import {
  chargedNodesHeldBy,
  depletedNodesOccupiedBy,
  energyForDepletedNodes,
  energyForNodesHeld,
} from "./energy";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { PowerLevel } from "./power";
import type { NodeState } from "./nodes";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, NodeState>>;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("energyForNodesHeld", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 6],
    [4, 10],
  ])("pays %i for holding %i nodes", (nodesHeld, energy) => {
    expect(energyForNodesHeld(nodesHeld)).toBe(energy);
  });

  it("throws for a negative count", () => {
    expect(() => energyForNodesHeld(-1)).toThrow(RangeError);
  });

  it("throws for a count above four", () => {
    expect(() => energyForNodesHeld(5)).toThrow(RangeError);
  });

  it("throws for a fractional count", () => {
    expect(() => energyForNodesHeld(2.5)).toThrow(RangeError);
  });
});

describe("chargedNodesHeldBy", () => {
  it("counts a ship standing on a charged node", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([squareFromName("H8")]);
  });

  it("does not count a ship on an inactive node", () => {
    const state = buildState({
      nodes: { H8: "inactive" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("does not count a ship on a depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("does not count an enemy ship on a charged node for this side", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("red-1", "red", "H8")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });

  it("counts two ships of the same side on two charged nodes, in ALL_SQUARES order", () => {
    const state = buildState({
      nodes: { L8: "charged", D8: "charged" },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    const d8Index = ALL_SQUARES.findIndex(
      (square) => square.column === "D" && square.row === 8,
    );
    const l8Index = ALL_SQUARES.findIndex(
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
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "D2")],
    });

    expect(chargedNodesHeldBy(state, "green")).toEqual([]);
  });
});

describe("energyForDepletedNodes", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 6],
    [4, 10],
  ])("costs %i for standing on %i depleted nodes", (depletedNodes, energy) => {
    expect(energyForDepletedNodes(depletedNodes)).toBe(energy);
  });

  it.each([5, 6, 7])(
    "clamps %i depleted nodes to the same price as four, without throwing",
    (depletedNodes) => {
      expect(energyForDepletedNodes(depletedNodes)).toBe(10);
    },
  );

  it("throws for a negative count", () => {
    expect(() => energyForDepletedNodes(-1)).toThrow(RangeError);
  });

  it("throws for a fractional count", () => {
    expect(() => energyForDepletedNodes(2.5)).toThrow(RangeError);
  });

  it("throws for a count above the most ships a side can ever have", () => {
    expect(() => energyForDepletedNodes(8)).toThrow(RangeError);
  });

  it("prices seven depleted nodes the same as four, without throwing — the bound is the maximum fleet, not the current game's", () => {
    expect(energyForDepletedNodes(7)).toBe(10);
    expect(energyForDepletedNodes(7)).toBe(energyForDepletedNodes(4));
    expect(() => energyForDepletedNodes(8)).toThrow(RangeError);
  });
});

describe("depletedNodesOccupiedBy", () => {
  it("counts a ship standing on a depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([
      squareFromName("H8"),
    ]);
  });

  it("does not count a ship on an inactive node", () => {
    const state = buildState({
      nodes: { H8: "inactive" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([]);
  });

  it("does not count a ship on a charged node", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([]);
  });

  it("does not count an enemy ship on a depleted node for this side", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("red-1", "red", "H8")],
    });

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([]);
  });

  it("counts two ships of the same side on two depleted nodes, in ALL_SQUARES order", () => {
    const state = buildState({
      nodes: { L8: "depleted", D8: "depleted" },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    const d8Index = ALL_SQUARES.findIndex(
      (square) => square.column === "D" && square.row === 8,
    );
    const l8Index = ALL_SQUARES.findIndex(
      (square) => square.column === "L" && square.row === 8,
    );
    expect(d8Index).toBeLessThan(l8Index);

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([
      squareFromName("D8"),
      squareFromName("L8"),
    ]);
  });

  it("returns an empty list for a side standing on no depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "D2")],
    });

    expect(depletedNodesOccupiedBy(state, "green")).toEqual([]);
  });
});
