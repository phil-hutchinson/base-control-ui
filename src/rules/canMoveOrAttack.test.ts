import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import {
  shipCanMoveOrAttack,
  sideToMoveCanMoveOrAttack,
} from "./canMoveOrAttack";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS, pliesForGameLength } from "./gameLength";
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
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  nodes?: Readonly<Record<string, NodeState>>;
  plyNumber?: number;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("sideToMoveCanMoveOrAttack", () => {
  it("is true with a legal move and no legal target", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });

    expect(sideToMoveCanMoveOrAttack(state)).toBe(true);
  });

  it("is true with a legal target and no legal move", () => {
    // green-1 at H8 (1 power) reaches only its eight neighbours, every
    // one of which is occupied by a red ship: no legal move, but every one
    // of those red ships is a legal attack target.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "G7"),
        ship("red-2", "red", "H7"),
        ship("red-3", "red", "I7"),
        ship("red-4", "red", "G8"),
        ship("red-5", "red", "I8"),
        ship("red-6", "red", "G9"),
        ship("red-7", "red", "H9"),
        ship("red-8", "red", "I9"),
      ],
    });

    expect(sideToMoveCanMoveOrAttack(state)).toBe(true);
  });

  it("is false with neither a legal move nor a legal target", () => {
    // green-1 is on the D6 planet, so §3.1 forbids it to attack regardless
    // of what stands next to it, and every square it could otherwise reach —
    // C6, E6, D5 and D7, its four orthogonal neighbours, its only reach at
    // 0 power — is occupied.
    const state = buildState({
      ships: [
        ship("green-1", "green", "D6", 0),
        ship("red-1", "red", "C6"),
        ship("red-2", "red", "E6"),
        ship("red-3", "red", "D5"),
        ship("red-4", "red", "D7"),
      ],
    });

    expect(sideToMoveCanMoveOrAttack(state)).toBe(false);
  });

  it("is false when the side's only ship holds a charged node and has no legal move, even surrounded by enemies (rules.md §7)", () => {
    // Without the charged-node protection, every one of these four
    // neighbours would be a legal target — see the "is true with a legal
    // target and no legal move" case above. Standing on a charged node
    // removes the attack entirely, so the side can neither move nor attack.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "G8"),
        ship("red-2", "red", "I8"),
        ship("red-3", "red", "H7"),
        ship("red-4", "red", "H9"),
      ],
      nodes: { H8: "charged" },
    });

    expect(sideToMoveCanMoveOrAttack(state)).toBe(false);
  });

  it("is false when the side's only ship is trapped on a depleted node and has no legal move, even surrounded by enemies (rules.md §7)", () => {
    // As with the charged-node case above, every one of these four
    // neighbours would otherwise be a legal target. Being trapped removes
    // the attack entirely, so the side can neither move nor attack.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "G8"),
        ship("red-2", "red", "I8"),
        ship("red-3", "red", "H7"),
        ship("red-4", "red", "H9"),
      ],
      nodes: { H8: "depleted" },
    });

    expect(sideToMoveCanMoveOrAttack(state)).toBe(false);
  });

  it("answers false once the game has ended, even with an obvious legal move (rules.md §9)", () => {
    const ships = [ship("green-1", "green", "H8")];
    const lastPly = pliesForGameLength(DEFAULT_GAME_LENGTH_ROUNDS);

    expect(
      sideToMoveCanMoveOrAttack(buildState({ ships, plyNumber: lastPly })),
    ).toBe(true);
    expect(
      sideToMoveCanMoveOrAttack(buildState({ ships, plyNumber: lastPly + 1 })),
    ).toBe(false);
  });
});

describe("shipCanMoveOrAttack", () => {
  it("is false for a ship holding a charged node with no legal move, even with an enemy in range (rules.md §7)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9")],
      nodes: { H8: "charged" },
    });

    expect(shipCanMoveOrAttack(state, "green-1")).toBe(true);
    // The move above is still legal from H8's other three neighbours; pin
    // the case where every one of them is also blocked, leaving only the
    // (refused) attack.
    const boxedIn = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "G8"),
        ship("green-3", "green", "I8"),
        ship("green-4", "green", "H7"),
        ship("red-1", "red", "H9"),
      ],
      nodes: { H8: "charged" },
    });

    expect(shipCanMoveOrAttack(boxedIn, "green-1")).toBe(false);
  });

  it("is false for a ship trapped on a depleted node, but true for a sibling elsewhere (§8.5)", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E5", 4),
        ship("green-2", "green", "H9", 1),
        ship("red-1", "red", "H10"),
      ],
      nodes: { E5: "depleted" },
    });

    // green-1 is trapped on the depleted node: it has no legal destination
    // and, with no enemy within reach, no legal target either.
    expect(shipCanMoveOrAttack(state, "green-1")).toBe(false);
    expect(shipCanMoveOrAttack(state, "green-2")).toBe(true);
  });

  it("is false for a ship trapped on a depleted node with no legal move, even with an enemy in range (rules.md §7)", () => {
    // Without the trap's protection, H9 would be a legal target: pin the
    // case where every other neighbour is also blocked, leaving only the
    // (refused) attack.
    const boxedIn = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "G8"),
        ship("green-3", "green", "I8"),
        ship("green-4", "green", "H7"),
        ship("red-1", "red", "H9"),
      ],
      nodes: { H8: "depleted" },
    });

    expect(shipCanMoveOrAttack(boxedIn, "green-1")).toBe(false);
  });
});
