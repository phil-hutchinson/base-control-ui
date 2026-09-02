import { describe, expect, it } from "vitest";
import { BAYS, isBay } from "./bays";
import { type Square, squareFromName, squareName } from "./board";
import {
  attackReach,
  attackRefusalReason,
  drawReturnBay,
  legalTargets,
} from "./combat";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import type { PowerLevel } from "./power";
import type { SiteState } from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
  actionsRemaining?: number;
  plyNumber?: number;
  lengthInRounds?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 2,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

function squareNames(squares: readonly Square[]) {
  return squares.map((square) => squareName(square)).sort();
}

describe("attackReach", () => {
  it("returns the entry with the right passedOver for a two-square orthogonal attack", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 2),
          ship("red-1", "red", "H10", 4),
        ],
      }),
      "green-1",
      squareFromName("H10"),
    );

    expect(entry).toBeDefined();
    expect(squareNames(entry?.passedOver ?? [])).toEqual(["H9"]);
  });

  it("returns the entry with the right passedOver for a two-square diagonal attack", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 3),
          ship("red-1", "red", "J10", 4),
        ],
      }),
      "green-1",
      squareFromName("J10"),
    );

    expect(entry).toBeDefined();
    expect(squareNames(entry?.passedOver ?? [])).toEqual(["I9"]);
  });

  it("returns undefined for a target beyond the attacker's reach", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("red-1", "red", "A1", 4),
        ],
      }),
      "green-1",
      squareFromName("A1"),
    );

    expect(entry).toBeUndefined();
  });
});

describe("attackRefusalReason / legalTargets", () => {
  it("a 0-power ship's targets are its four orthogonal neighbours, and never a diagonal one", () => {
    const orthogonalNeighbours = ["G8", "I8", "H7", "H9"];
    const diagonalNeighbours = ["G7", "G9", "I7", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ...orthogonalNeighbours.map((square, index) =>
          ship(`red-o-${index}`, "red", square, 4),
        ),
        ...diagonalNeighbours.map((square, index) =>
          ship(`red-d-${index}`, "red", square, 4),
        ),
      ],
    });

    expect(squareNames(legalTargets(state, "green-1"))).toEqual(
      squareNames(orthogonalNeighbours.map(squareFromName)),
    );
    expect(attackRefusalReason(state, "green-1", squareFromName("G7"))).toBe(
      "target-out-of-range",
    );
  });

  it("a 1-power ship's targets are exactly the eight neighbours around it", () => {
    const neighbours = ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ...neighbours.map((square, index) =>
          ship(`red-${index}`, "red", square, 4),
        ),
      ],
    });

    expect(squareNames(legalTargets(state, "green-1"))).toEqual(
      squareNames(neighbours.map(squareFromName)),
    );
  });

  it("a full-power ship can attack three squares orthogonally and two diagonally", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 4),
        ship("red-orthogonal", "red", "H11", 4),
        ship("red-diagonal", "red", "J10", 4),
      ],
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("H11")),
    ).toBeUndefined();
    expect(
      attackRefusalReason(state, "green-1", squareFromName("J10")),
    ).toBeUndefined();
  });

  it("refuses attack-path-blocked when a ship of either side stands between attacker and target, and the same attack is legal once that square is empty", () => {
    const withBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 4),
        ship("red-1", "red", "H10", 4),
      ],
    });
    const withEnemyBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-blocker", "red", "H9", 4),
        ship("red-1", "red", "H10", 4),
      ],
    });
    const cleared = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-1", "red", "H10", 4),
      ],
    });

    expect(
      attackRefusalReason(withBlocker, "green-1", squareFromName("H10")),
    ).toBe("attack-path-blocked");
    expect(
      attackRefusalReason(withEnemyBlocker, "green-1", squareFromName("H10")),
    ).toBe("attack-path-blocked");
    expect(
      attackRefusalReason(cleared, "green-1", squareFromName("H10")),
    ).toBeUndefined();
  });

  it("refuses target-out-of-range for a target beyond the reach", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "H11", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H11"))).toBe(
      "target-out-of-range",
    );
  });

  it("refuses an attacker standing in a bay", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H15", 2),
        ship("red-1", "red", "H14", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H14"))).toBe(
      "attacker-in-bay",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target standing in a bay, distinguishably from the attacker's own", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H14", 2),
        ship("red-1", "red", "H15", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H15"))).toBe(
      "target-in-bay",
    );
  });

  it("refuses an empty target square, and a friendly target", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H7"))).toBe(
      "no-target-there",
    );
    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-is-friendly",
    );
  });

  it("refuses an enemy ship attempting to attack", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      sideToMove: "green",
    });

    expect(attackRefusalReason(state, "red-1", squareFromName("H8"))).toBe(
      "not-your-ship",
    );
  });

  it("refuses a ship that has already acted this ply, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "ship-already-acted",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });
});

describe("attackRefusalReason / legalTargets on a site that is not charged (§8.5)", () => {
  it("neither blocks an attack nor blocks the attacker's ship from being attacked", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7", 0), ship("red-1", "red", "E8", 4)],
      siteStates: { E7: "active", E8: "dormant" },
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("E8")),
    ).toBeUndefined();
    expect(legalTargets(state, "green-1")).toContainEqual(squareFromName("E8"));
  });

  it("lets a ship on a dormant site attack a ship on an active site, the roles swapped", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7", 0), ship("red-1", "red", "E8", 4)],
      siteStates: { E7: "dormant", E8: "active" },
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("E8")),
    ).toBeUndefined();
    expect(legalTargets(state, "green-1")).toContainEqual(squareFromName("E8"));
  });
});

describe("attackRefusalReason / legalTargets on a charged node (§7)", () => {
  it("refuses an attacker standing on a charged node, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      siteStates: { H8: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-charged-node",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target standing on a charged node, and it is absent from legalTargets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      siteStates: { H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-charged-node",
    );
    expect(legalTargets(state, "green-1")).not.toContainEqual(
      squareFromName("H9"),
    );
  });

  it("refuses a protected target within reach as protected, not as out of range", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 4)],
      siteStates: { H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-charged-node",
    );
  });

  it("reports the attacker's own reason ahead of the target's when both stand on charged nodes", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      siteStates: { H8: "charged", H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-charged-node",
    );
  });
});

describe("attackRefusalReason and legalTargets once the game is over", () => {
  it("refuses an attack that would otherwise be legal, with game-over ahead of any other reason", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 61,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });

  it("refuses an attack that would have been illegal anyway, still with game-over", () => {
    const notAdjacent = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "K5", 4)],
      plyNumber: 61,
    });
    const notYourShip = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      sideToMove: "red",
      plyNumber: 61,
    });

    expect(
      attackRefusalReason(notAdjacent, "green-1", squareFromName("K5")),
    ).toBe("game-over");
    expect(
      attackRefusalReason(notYourShip, "green-1", squareFromName("H9")),
    ).toBe("game-over");
  });

  it("legalTargets contains a target legal before the game ends, and is empty in the same state once it has", () => {
    const beforeEnd = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 60,
    });
    const afterEnd: GameState = { ...beforeEnd, plyNumber: 61 };

    expect(legalTargets(beforeEnd, "green-1")).toContainEqual(
      squareFromName("H9"),
    );
    expect(legalTargets(afterEnd, "green-1")).toEqual([]);
  });

  it("judges game-over against the state's own length, not the default", () => {
    const notOver = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 6,
      lengthInRounds: 3,
    });
    const over = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 7,
      lengthInRounds: 3,
    });

    expect(
      attackRefusalReason(notOver, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(attackRefusalReason(over, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });
});

describe("drawReturnBay", () => {
  it("always draws a bay that was empty in the state drawn against", () => {
    const state = buildState({
      ships: [
        ship("red-1", "red", "H15", 4),
        ship("red-2", "red", "L15", 4),
        ship("red-3", "red", "O14", 4),
      ],
    });
    const occupied = new Set(["H15", "L15", "O14"]);

    for (let seed = 0; seed < 200; seed++) {
      const [bay] = drawReturnBay({ ...state, randomSeed: seed });
      expect(isBay(bay)).toBe(true);
      expect(occupied.has(squareName(bay))).toBe(false);
    }
  });

  it("gives the one empty bay for every seed when every other bay is occupied", () => {
    const occupiedBays = BAYS.filter((square) => squareName(square) !== "H15");
    const state = buildState({
      ships: occupiedBays.map((square, index) =>
        ship(`red-${index}`, "red", squareName(square), 4),
      ),
    });

    for (let seed = 0; seed < 50; seed++) {
      const [bay] = drawReturnBay({ ...state, randomSeed: seed });
      expect(squareName(bay)).toBe("H15");
    }
  });

  it("gives the same bay for the same seed", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H15", 4)],
    });

    const [firstBay, firstNextSeed] = drawReturnBay(state);
    const [secondBay, secondNextSeed] = drawReturnBay(state);

    expect(squareName(secondBay)).toBe(squareName(firstBay));
    expect(secondNextSeed).toBe(firstNextSeed);
  });

  it("advances the seed away from the one passed in", () => {
    const state = buildState({ ships: [] });

    for (let seed = 0; seed < 50; seed++) {
      const [, nextSeed] = drawReturnBay({ ...state, randomSeed: seed });
      expect(nextSeed).not.toBe(seed);
    }
  });

  it("is live: moving a ship out of a bay changes the answer", () => {
    const occupiedState = buildState({
      ships: [ship("red-1", "red", "H15", 4)],
    });
    const [occupiedBay] = drawReturnBay(occupiedState);
    expect(squareName(occupiedBay)).not.toBe("H15");

    const vacatedState = buildState({
      ships: [ship("red-1", "red", "E7", 4)],
    });
    const otherOccupiedBays = BAYS.filter(
      (square) => squareName(square) !== "H15",
    );
    const fullyVacatedExceptOne: GameState = {
      ...vacatedState,
      ships: [
        ship("red-1", "red", "E7", 4),
        ...otherOccupiedBays.map((square, index) =>
          ship(`red-${index + 2}`, "red", squareName(square), 4),
        ),
      ],
    };
    const [vacatedBay] = drawReturnBay(fullyVacatedExceptOne);
    expect(squareName(vacatedBay)).toBe("H15");
  });

  it("throws naming §7.1 when every bay is occupied", () => {
    const state = buildState({
      ships: BAYS.map((square, index) =>
        ship(`red-${index}`, "red", squareName(square), 4),
      ),
    });

    expect(() => drawReturnBay(state)).toThrow(/§7\.1/);
  });

  it("spreads draws over chained seeds across every empty bay, never an occupied one", () => {
    const occupiedBays = new Set(["H15", "O14", "O6", "D1", "A6"]);
    const state = buildState({
      ships: [...occupiedBays].map((name, index) =>
        ship(`red-${index}`, "red", name, 4),
      ),
    });
    const emptyBayNames = new Set(
      BAYS.map(squareName).filter((name) => !occupiedBays.has(name)),
    );

    const seenBayNames = new Set<string>();
    let seed = 12345;
    for (let draw = 0; draw < 500; draw++) {
      const [bay, nextSeed] = drawReturnBay({ ...state, randomSeed: seed });
      const name = squareName(bay);
      expect(occupiedBays.has(name)).toBe(false);
      seenBayNames.add(name);
      seed = nextSeed;
    }

    expect(seenBayNames).toEqual(emptyBayNames);
  });
});
