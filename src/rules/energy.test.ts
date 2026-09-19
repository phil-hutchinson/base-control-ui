import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareFromName } from "./board";
import { chargedNodesHeldBy, energyForNodesHeld } from "./energy";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { PowerLevel } from "./power";
import type { NodeState } from "./nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";

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
    nodeRotation: "continuous",
    rotators: [],
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: "simple",
  };
}

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

describe("energyForNodesHeld", () => {
  it("returns the count itself under simple, for zero through five", () => {
    for (let nodesHeld = 0; nodesHeld <= 5; nodesHeld++) {
      expect(energyForNodesHeld(nodesHeld, "simple")).toBe(nodesHeld);
    }
  });

  it("returns the triangular total under bonus, for zero through five", () => {
    const expected = [0, 1, 3, 6, 10, 15];
    expected.forEach((amount, nodesHeld) => {
      expect(energyForNodesHeld(nodesHeld, "bonus")).toBe(amount);
    });
  });

  it("pays zero for zero nodes at both settings", () => {
    expect(energyForNodesHeld(0, "simple")).toBe(0);
    expect(energyForNodesHeld(0, "bonus")).toBe(0);
  });

  it("is a formula rather than a capped table", () => {
    expect(energyForNodesHeld(6, "bonus")).toBe(21);
    expect(energyForNodesHeld(7, "bonus")).toBe(28);
  });
});
