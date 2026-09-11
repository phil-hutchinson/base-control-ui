import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, NodeStatus, Ship } from "./gameState";
import type { NodeState } from "./nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";
import { PLANETS } from "./planets";
import type { PowerLevel } from "./power";
import {
  isShipTrapped,
  isSideAllTrapped,
  trappedShips,
  trappingNodesFor,
} from "./trap";

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
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("isShipTrapped", () => {
  it("is trapped on a depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(isShipTrapped(state, "green-1")).toBe(true);
  });

  it("is not trapped on a charged node", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(isShipTrapped(state, "green-1")).toBe(false);
  });

  it("is not trapped on an inactive node", () => {
    const state = buildState({
      nodes: { H8: "inactive" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(isShipTrapped(state, "green-1")).toBe(false);
  });

  it("is not trapped on a square with no node at all", () => {
    const state = buildState({
      nodes: {},
      ships: [ship("green-1", "green", "H8")],
    });

    expect(isShipTrapped(state, "green-1")).toBe(false);
  });

  it("is not trapped on a planet, which the node draw excludes (§3.2)", () => {
    const planetSquare = PLANETS[0];
    const state = buildState({
      nodes: {},
      ships: [ship("green-1", "green", squareName(planetSquare))],
    });

    expect(isShipTrapped(state, "green-1")).toBe(false);
  });

  it("throws for an id with no ship in the state", () => {
    const state = buildState({});

    expect(() => isShipTrapped(state, "green-1")).toThrow(RangeError);
  });
});

describe("trappingNodesFor", () => {
  it("counts a ship standing on a depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(trappingNodesFor(state, "green")).toEqual([squareFromName("H8")]);
  });

  it("does not count a ship on an inactive node", () => {
    const state = buildState({
      nodes: { H8: "inactive" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(trappingNodesFor(state, "green")).toEqual([]);
  });

  it("does not count a ship on a charged node", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(trappingNodesFor(state, "green")).toEqual([]);
  });

  it("does not count an enemy ship on a depleted node for this side", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("red-1", "red", "H8")],
    });

    expect(trappingNodesFor(state, "green")).toEqual([]);
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

    expect(trappingNodesFor(state, "green")).toEqual([
      squareFromName("D8"),
      squareFromName("L8"),
    ]);
  });

  it("returns an empty list for a side standing on no depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [ship("green-1", "green", "D2")],
    });

    expect(trappingNodesFor(state, "green")).toEqual([]);
  });
});

describe("trappedShips", () => {
  it("returns the ships trapping those nodes, in the same board order", () => {
    const state = buildState({
      nodes: { L8: "depleted", D8: "depleted" },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    expect(trappedShips(state, "green").map((s) => s.id)).toEqual([
      "green-2",
      "green-1",
    ]);
  });

  it("excludes the other side's trapped ships", () => {
    const state = buildState({
      nodes: { H8: "depleted", D2: "depleted" },
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "D2")],
    });

    expect(trappedShips(state, "green").map((s) => s.id)).toEqual(["green-1"]);
  });

  it("is empty when the side has no trapped ship", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    expect(trappedShips(state, "green")).toEqual([]);
  });
});

describe("isSideAllTrapped", () => {
  it("is true when every ship of the side is on a depleted node", () => {
    const state = buildState({
      nodes: { H8: "depleted", D2: "depleted" },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
    });

    expect(isSideAllTrapped(state, "green")).toBe(true);
  });

  it("is false when one ship of the side is free", () => {
    const state = buildState({
      nodes: { H8: "depleted", D2: "charged" },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
    });

    expect(isSideAllTrapped(state, "green")).toBe(false);
  });

  it("is false when one ship of the side is on a planet", () => {
    const planetSquare = PLANETS[0];
    const state = buildState({
      nodes: { H8: "depleted" },
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", squareName(planetSquare)),
      ],
    });

    expect(isSideAllTrapped(state, "green")).toBe(false);
  });

  it("is false when one ship of the side is on an inactive node", () => {
    const state = buildState({
      nodes: { H8: "depleted", D2: "inactive" },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
    });

    expect(isSideAllTrapped(state, "green")).toBe(false);
  });

  it("is false for a side with no ships at all", () => {
    const state = buildState({ nodes: {}, ships: [] });

    expect(isSideAllTrapped(state, "green")).toBe(false);
  });

  it("is unaffected by the other side's trapped ships", () => {
    const state = buildState({
      nodes: { H8: "depleted", D2: "depleted" },
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "D2")],
    });

    expect(isSideAllTrapped(state, "green")).toBe(true);
    expect(isSideAllTrapped(state, "red")).toBe(true);
  });
});
