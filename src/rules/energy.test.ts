import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareFromName } from "./board";
import {
  chargedNodesHeldBy,
  energyForNodesHeld,
  turnCollection,
} from "./energy";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { PowerLevel } from "./power";
import type { ChargedNodeCount, NodeState } from "./nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";
import type { NodeSignal } from "./steal";
import type { PlayerMatchingSetting } from "./playerMatching";
import type { ScoringSetting } from "./scoring";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<
    Record<string, NodeState | readonly [NodeState, NodeSignal]>
  >,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, entry]) => {
      const [state, signal] = Array.isArray(entry) ? entry : [entry, undefined];
      return [
        name,
        { state, level: 0, ...(signal !== undefined ? { signal } : {}) },
      ];
    }),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<
    Record<string, NodeState | readonly [NodeState, NodeSignal]>
  >;
  nodePlaystyle?: "continuous" | "steal";
  chargedNodeCount?: ChargedNodeCount;
  scoring?: ScoringSetting;
  playerMatching?: PlayerMatchingSetting;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    nodePlaystyle: config.nodePlaystyle ?? "continuous",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    advancedBonuses: [],
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: config.scoring ?? "simple",
    playerMatching: config.playerMatching ?? "off",
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

describe("turnCollection", () => {
  // A five-node steal game: red is matched to signal 3, green to signal 4
  // (steal.md §9). Squares B2, C3, D4, E5, F6 carry signals 0 through 4.
  const SIGNAL_0 = "B2";
  const SIGNAL_1 = "C3";
  const SIGNAL_3_RED_OWN = "E5";
  const SIGNAL_4_GREEN_OWN = "F6";

  it("DOUBLE: counts the own node twice, prices the whole turn on that count, and names the own-node square", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "bonus",
      playerMatching: "double",
      nodes: {
        [SIGNAL_1]: ["charged", 1],
        [SIGNAL_3_RED_OWN]: ["charged", 3],
      },
      ships: [
        ship("red-1", "red", SIGNAL_1),
        ship("red-2", "red", SIGNAL_3_RED_OWN),
      ],
    });

    const result = turnCollection(state, "red");

    expect(result.standingOnOwnNode).toBe(true);
    expect(result.ownNodeSquare).toEqual(squareFromName(SIGNAL_3_RED_OWN));
    expect(result.countedNodes).toBe(3);
    expect(result.withheld).toBe(false);
    expect(result.amount).toBe(6);
  });

  it("DOUBLE: holding the opponent's own node counts it once, like any other", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "simple",
      playerMatching: "double",
      nodes: {
        [SIGNAL_1]: ["charged", 1],
        [SIGNAL_4_GREEN_OWN]: ["charged", 4],
      },
      ships: [
        ship("red-1", "red", SIGNAL_1),
        ship("red-2", "red", SIGNAL_4_GREEN_OWN),
      ],
    });

    const result = turnCollection(state, "red");

    expect(result.standingOnOwnNode).toBe(false);
    expect(result.ownNodeSquare).toBeUndefined();
    expect(result.countedNodes).toBe(2);
    expect(result.amount).toBe(2);
  });

  it("DOUBLE: the own node alone counts as two", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "bonus",
      playerMatching: "double",
      nodes: { [SIGNAL_3_RED_OWN]: ["charged", 3] },
      ships: [ship("red-1", "red", SIGNAL_3_RED_OWN)],
    });

    const result = turnCollection(state, "red");

    expect(result.countedNodes).toBe(2);
    expect(result.amount).toBe(3);
  });

  it("REQUIRED: holding nodes but not the own one withholds the whole turn", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "bonus",
      playerMatching: "required",
      nodes: {
        [SIGNAL_0]: ["charged", 0],
        [SIGNAL_1]: ["charged", 1],
      },
      ships: [ship("red-1", "red", SIGNAL_0), ship("red-2", "red", SIGNAL_1)],
    });

    const result = turnCollection(state, "red");

    expect(result.withheld).toBe(true);
    expect(result.countedNodes).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("REQUIRED: holding the own node pays exactly what OFF would for the same held count", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "bonus",
      playerMatching: "required",
      nodes: {
        [SIGNAL_0]: ["charged", 0],
        [SIGNAL_3_RED_OWN]: ["charged", 3],
      },
      ships: [
        ship("red-1", "red", SIGNAL_0),
        ship("red-2", "red", SIGNAL_3_RED_OWN),
      ],
    });

    const result = turnCollection(state, "red");

    expect(result.withheld).toBe(false);
    expect(result.countedNodes).toBe(2);
    expect(result.amount).toBe(energyForNodesHeld(2, "bonus"));
  });

  it("REQUIRED: holding nothing is not withheld, and pays nothing", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "bonus",
      playerMatching: "required",
      nodes: { [SIGNAL_3_RED_OWN]: ["charged", 3] },
      ships: [],
    });

    const result = turnCollection(state, "red");

    expect(result.withheld).toBe(false);
    expect(result.countedNodes).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("OFF: prices exactly the held count, standing on nothing that counts as its own", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 5,
      scoring: "simple",
      playerMatching: "off",
      nodes: {
        [SIGNAL_1]: ["charged", 1],
        [SIGNAL_3_RED_OWN]: ["charged", 3],
      },
      ships: [
        ship("red-1", "red", SIGNAL_1),
        ship("red-2", "red", SIGNAL_3_RED_OWN),
      ],
    });

    const result = turnCollection(state, "red");

    expect(result.standingOnOwnNode).toBe(false);
    expect(result.ownNodeSquare).toBeUndefined();
    expect(result.countedNodes).toBe(2);
    expect(result.amount).toBe(2);
  });

  it("a four-node game matches red to signal 2 and doubles it when held", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      scoring: "simple",
      playerMatching: "double",
      nodes: { D4: ["charged", 2] },
      ships: [ship("red-1", "red", "D4")],
    });

    const result = turnCollection(state, "red");

    expect(result.standingOnOwnNode).toBe(true);
    expect(result.countedNodes).toBe(2);
  });

  it("a three-node game matches red to signal 1 and does not withhold when it is held", () => {
    const state = buildState({
      nodePlaystyle: "steal",
      chargedNodeCount: 3,
      scoring: "simple",
      playerMatching: "required",
      nodes: { C3: ["charged", 1] },
      ships: [ship("red-1", "red", "C3")],
    });

    const result = turnCollection(state, "red");

    expect(result.standingOnOwnNode).toBe(true);
    expect(result.withheld).toBe(false);
    expect(result.countedNodes).toBe(1);
  });
});
