import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import type { ShipId } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { GameState, NodeStatus, Ship } from "./gameState";
import type { NodeState } from "./nodes";
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
    outOfTime: { green: false, red: false },
  };
}

describe("reliefSquare", () => {
  it("answers nothing when one ship of the side is still free", () => {
    const state = buildState({
      nodes: { H8: node("depleted", 3), D2: node("charged", 0) },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
    });

    const [square] = reliefSquare(state, "green");
    expect(square).toBeUndefined();
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

    const [square] = reliefSquare(state, "green");
    expect(square).toBeUndefined();
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

    const [square] = reliefSquare(state, "green");
    expect(square).toBeUndefined();
  });

  it("picks the qualifying node with the least remaining life among several, with no draw made", () => {
    // D8 has more remaining life (level 5) than L8 (level 2), so L8's ship —
    // with less remaining life — is the one freed outright: there is no tie,
    // so no seed is drawn.
    const state = buildState({
      nodes: { D8: node("depleted", 5), L8: node("depleted", 2) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
    });

    const [square, nextSeed] = reliefSquare(state, "green");
    expect(square).toEqual(squareFromName("L8"));
    expect(nextSeed).toBe(state.randomSeed);
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

    const [square, nextSeed] = reliefSquare(state, "green");
    expect(square).toEqual(squareFromName("H8"));
    expect(nextSeed).toBe(state.randomSeed);
  });

  it("breaks a tie on the lowest level at random, following the seed rather than which square comes first", () => {
    // D8 and L8 tie at level 3, and both ships would have a legal move once
    // freed, so this is a genuine tie: which one ends is decided by drawing
    // from the seeded stream, not by which comes first on the board. Seeds 1
    // and 7 are chosen because they draw opposite outcomes from this
    // two-candidate tie.
    const nodes = { D8: node("depleted", 3), L8: node("depleted", 3) };
    const ships = [
      ship("green-1", "green", "L8"),
      ship("green-2", "green", "D8"),
    ];

    const [squareForSeed1] = reliefSquare(
      buildState({ nodes, ships, randomSeed: 1 }),
      "green",
    );
    const [squareForSeed7] = reliefSquare(
      buildState({ nodes, ships, randomSeed: 7 }),
      "green",
    );

    expect(squareForSeed1).toEqual(squareFromName("L8"));
    expect(squareForSeed7).toEqual(squareFromName("D8"));
    expect(squareForSeed1).not.toEqual(squareForSeed7);
  });

  it("picks the same square from the same seed every time", () => {
    const state = buildState({
      nodes: { D8: node("depleted", 3), L8: node("depleted", 3) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
      randomSeed: 1,
    });

    const [firstSquare] = reliefSquare(state, "green");
    const [secondSquare] = reliefSquare(state, "green");

    expect(firstSquare).toEqual(secondSquare);
  });

  it("advances the seed only when a tie is actually broken", () => {
    const tied = buildState({
      nodes: { D8: node("depleted", 3), L8: node("depleted", 3) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
      randomSeed: 1,
    });
    const [, nextSeedForTie] = reliefSquare(tied, "green");
    expect(nextSeedForTie).not.toBe(tied.randomSeed);

    const untied = buildState({
      nodes: { D8: node("depleted", 5), L8: node("depleted", 2) },
      ships: [ship("green-1", "green", "L8"), ship("green-2", "green", "D8")],
      randomSeed: 1,
    });
    const [, nextSeedForUntied] = reliefSquare(untied, "green");
    expect(nextSeedForUntied).toBe(untied.randomSeed);

    const noCandidate = buildState({
      nodes: { H8: node("depleted", 3), D2: node("charged", 0) },
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "D2")],
      randomSeed: 1,
    });
    const [, nextSeedForNoCandidate] = reliefSquare(noCandidate, "green");
    expect(nextSeedForNoCandidate).toBe(noCandidate.randomSeed);
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
