import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "./bays";
import { type Square, squareFromName, squareName } from "./board";
import {
  adjacentSquares,
  attackRefusalReason,
  legalTargets,
  sevenOnlyAttackRefusalReason,
  sevenOnlyLegalTargets,
} from "./combat";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { reachFrom } from "./movement";
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
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [
      name,
      { state, enteredOnPly: 0 },
    ]),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  movedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
  actionsRemaining?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 2,
    movedThisPly: config.movedThisPly ?? [],
    plyNumber: 1,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
  };
}

function squareNames(squares: readonly Square[]) {
  return squares.map((square) => squareName(square)).sort();
}

describe("adjacentSquares", () => {
  it("gives all eight neighbours of an interior square", () => {
    expect(squareNames(adjacentSquares(squareFromName("H8")))).toEqual(
      ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"].sort(),
    );
  });

  it("gives five neighbours on an edge and three at a corner", () => {
    expect(adjacentSquares(squareFromName("H15"))).toHaveLength(5);
    expect(adjacentSquares(squareFromName("A1"))).toHaveLength(3);
  });
});

describe("sevenOnlyAttackRefusalReason / sevenOnlyLegalTargets", () => {
  it("targets all eight neighbours holding enemy ships, and not a ship two squares away", () => {
    const neighbours = adjacentSquares(squareFromName("H8"));
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ...neighbours.map((square, index) =>
          ship(`red-${index}`, "red", squareName(square), 0),
        ),
        ship("red-far", "red", "H10", 0),
      ],
    });

    expect(squareNames(sevenOnlyLegalTargets(state, "green-1"))).toEqual(
      squareNames(neighbours),
    );
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H10")),
    ).toBe("target-not-adjacent");
  });

  it("a 4-shield ship can strike diagonally though it cannot move that way", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "I9", 0)],
    });

    expect(
      reachFrom(squareFromName("H8"), 4).some(
        (entry) => squareName(entry.destination) === "I9",
      ),
    ).toBe(false);
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("I9")),
    ).toBeUndefined();
  });

  it("a 0-shield ship's three-square orthogonal reach grants it no extra attack range", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "H11", 0),
      ],
    });

    expect(
      reachFrom(squareFromName("H8"), 0).some(
        (entry) => squareName(entry.destination) === "H11",
      ),
    ).toBe(true);
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H11")),
    ).toBe("target-not-adjacent");
  });

  it("refuses an attacker standing in a bay", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H15", 2),
        ship("red-1", "red", "H14", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H14")),
    ).toBe("attacker-in-bay");
    expect(sevenOnlyLegalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target standing in a bay, distinguishably from the attacker's own", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H14", 2),
        ship("red-1", "red", "H15", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H15")),
    ).toBe("target-in-bay");
  });

  it("refuses an empty target square, and a friendly target", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H7")),
    ).toBe("no-target-there");
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H9")),
    ).toBe("target-is-friendly");
  });

  it("refuses an enemy ship attempting to attack", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 0)],
      sideToMove: "green",
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "red-1", squareFromName("H8")),
    ).toBe("not-your-ship");
  });

  it("a ship that has already moved this ply still has its targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 0)],
      movedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(squareNames(sevenOnlyLegalTargets(state, "green-1"))).toEqual([
      "H9",
    ]);
  });
});

describe("attackRefusalReason / legalTargets with the §8.5 obligation", () => {
  it("refuses every attack, including the owing ship's own, while any ship owes an action", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7", 4),
        ship("green-2", "green", "A1", 2),
        ship("red-1", "red", "E8", 0),
        ship("red-2", "red", "A2", 0),
      ],
      siteStates: { E7: "dormant" },
    });

    expect(attackRefusalReason(state, "green-2", squareFromName("A2"))).toBe(
      "another-ship-stranded",
    );
    expect(attackRefusalReason(state, "green-1", squareFromName("E8"))).toBe(
      "another-ship-stranded",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
    expect(legalTargets(state, "green-2")).toEqual([]);
  });

  it("attacks are legal again once the freeing move is made, including with the ship just freed", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E8", 4),
        ship("green-2", "green", "B2", 2),
        ship("red-1", "red", "E9", 0),
        ship("red-2", "red", "B1", 0),
      ],
      movedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("E9")),
    ).toBeUndefined();
    expect(
      attackRefusalReason(state, "green-2", squareFromName("B1")),
    ).toBeUndefined();
  });

  it("leaves attacks legal for the whole side when a stranded ship's obligation is waived", () => {
    const boxedInSquare = "H8";
    const state = buildState({
      ships: [
        ship("green-1", "green", boxedInSquare, 4),
        ship("red-1", "red", "H9", 0),
        ship("red-2", "red", "H7", 0),
        ship("red-3", "red", "I8", 0),
        ship("red-4", "red", "G8", 0),
        ship("green-2", "green", "B2", 2),
        ship("red-5", "red", "B1", 0),
      ],
      siteStates: { [boxedInSquare]: "depleted" },
      actionsRemaining: 2,
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(
      attackRefusalReason(state, "green-2", squareFromName("B1")),
    ).toBeUndefined();
  });
});
