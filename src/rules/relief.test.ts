import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, NodeStatus, Ship } from "./gameState";
import type { NodeState } from "./nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "./nodes";
import type { PowerLevel } from "./power";
import { reliefSquare } from "./relief";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function node(state: NodeState, level: number): NodeStatus {
  return { state, level };
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, NodeStatus>>;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: config.nodes ?? {},
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: config.randomSeed ?? 1,
    openingSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("reliefSquare", () => {
  it("answers nothing when one ship of the side is still free", () => {
    const state = buildState({
      nodes: { H8: node("depleted", 3), D2: node("charged", 0) },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
    });

    expect(reliefSquare(state, "green")).toBeUndefined();
  });

  it("answers nothing when every ship is trapped but none would have a legal move once freed", () => {
    // A1 is a corner: at power 0 the only affordable moves are the two
    // orthogonal steps to B1 and A2, and both are occupied by an enemy ship
    // — boxed in by ships and the edge of the board, not by the trap.
    const state = buildState({
      nodes: { A1: node("depleted", 1) },
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
    });

    expect(reliefSquare(state, "green")).toBeUndefined();
  });

  it("answers nothing when a trapped ship's only reachable squares are other depleted nodes", () => {
    // At power 0, H8's only affordable moves are its four orthogonal
    // neighbours, each of which is itself a depleted node and so still
    // barred as a destination even once H8's own node has ended.
    const state = buildState({
      nodes: {
        H8: node("depleted", 1),
        G8: node("depleted", 4),
        I8: node("depleted", 4),
        H7: node("depleted", 4),
        H9: node("depleted", 4),
      },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    expect(reliefSquare(state, "green")).toBeUndefined();
  });

  it("picks the qualifying node with the least remaining life among several", () => {
    // D8 has more remaining life (level 5) than L8 (level 2), so L8's ship —
    // with less remaining life — is the one freed.
    const state = buildState({
      nodes: { D8: node("depleted", 5), L8: node("depleted", 2) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    expect(reliefSquare(state, "green")).toEqual(squareFromName("L8"));
  });

  it("skips a lower-level candidate that would have no move, in favour of a higher-level one that would", () => {
    const state = buildState({
      nodes: { A1: node("depleted", 1), H8: node("depleted", 5) },
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
        ship("green-2", "green", "H8"),
      ],
    });

    expect(reliefSquare(state, "green")).toEqual(squareFromName("H8"));
  });

  it("breaks a tie on the lowest level by board order, not at random", () => {
    // D8 and L8 tie at level 3, and both ships would have a legal move once
    // freed. This tie cannot arise in real play (rules.md §8.3: a side's
    // trapped ships' nodes always have distinct remaining lives), so this is
    // a hand-built fixture pinning the deterministic tidy-up of the
    // unreachable case — the first candidate in board order wins.
    const nodes = { D8: node("depleted", 3), L8: node("depleted", 3) };
    const ships = [
      ship("green-1", "green", "L8"),
      ship("green-2", "green", "D8"),
    ];

    expect(reliefSquare(buildState({ nodes, ships }), "green")).toEqual(
      squareFromName("D8"),
    );
  });

  it("picks the same square every time, regardless of the seed", () => {
    const state = buildState({
      nodes: { D8: node("depleted", 3), L8: node("depleted", 3) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
      randomSeed: 1,
    });

    const first = reliefSquare(state, "green");
    const second = reliefSquare(state, "green");

    expect(first).toEqual(second);
  });

  it("does not modify the state it is given", () => {
    const state = buildState({
      nodes: { D8: node("depleted", 5), L8: node("depleted", 2) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });
    const before = structuredClone(state);

    reliefSquare(state, "green");

    expect(state).toEqual(before);
  });
});
