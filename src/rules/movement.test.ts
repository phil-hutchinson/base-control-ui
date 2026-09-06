import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  COLUMN_LETTERS,
  isOnBoard,
  type Square,
  squareAt,
  squareFromName,
  squareName,
} from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  allShapesFrom,
  legalDestinations,
  type MoveRefusalReason,
  moveRefusalReason,
  reachFrom,
  shapeReaching,
  sideToMoveHasLegalMove,
} from "./movement";
import type { PowerLevel } from "./power";
import type { NodeState } from "./nodes";

const POWER_LEVELS: readonly PowerLevel[] = [0, 1, 2, 3, 4, 5, 6];

function destinationNames(origin: string, power: PowerLevel): string[] {
  return reachFrom(squareFromName(origin), power)
    .map((entry) => squareName(entry.destination))
    .sort();
}

describe("reachFrom", () => {
  it("matches §6's table exactly from an unobstructed centre square", () => {
    expect(destinationNames("H8", 0)).toEqual(["G8", "H7", "H9", "I8"].sort());

    expect(destinationNames("H8", 1)).toEqual(
      ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"].sort(),
    );

    const fullReach = [
      // one square orthogonally
      "G8",
      "I8",
      "H7",
      "H9",
      // one square diagonally
      "G7",
      "G9",
      "I7",
      "I9",
      // two squares orthogonally
      "F8",
      "J8",
      "H6",
      "H10",
      // the L
      "J9",
      "J7",
      "F9",
      "F7",
      "I10",
      "I6",
      "G10",
      "G6",
    ].sort();

    for (const power of [2, 3, 4, 5, 6] as const) {
      expect(destinationNames("H8", power)).toEqual(fullReach);
    }

    expect(destinationNames("H8", 0)).toHaveLength(4);
    expect(destinationNames("H8", 1)).toHaveLength(8);
    expect(destinationNames("H8", 2)).toHaveLength(20);
  });

  it("accumulates upward: each power level's set is a superset of the previous", () => {
    for (let index = 0; index < POWER_LEVELS.length - 1; index++) {
      const lowerPowerSet = new Set(
        destinationNames("H8", POWER_LEVELS[index]),
      );
      const higherPowerSet = new Set(
        destinationNames("H8", POWER_LEVELS[index + 1]),
      );

      for (const square of lowerPowerSet) {
        expect(higherPowerSet.has(square)).toBe(true);
      }
    }
  });

  it("never reaches two squares diagonally or three squares orthogonally, at any power level", () => {
    for (const power of POWER_LEVELS) {
      const destinations = destinationNames("H8", power);
      expect(destinations).not.toContain("J10");
      expect(destinations).not.toContain("F6");
      expect(destinations).not.toContain("K8");
      expect(destinations).not.toContain("E8");
    }
  });

  it("is clipped by the board's edges", () => {
    for (const power of POWER_LEVELS) {
      const cornerEntries = reachFrom(squareFromName("A1"), power);
      const edgeEntries = reachFrom(squareFromName("A8"), power);

      for (const entry of [...cornerEntries, ...edgeEntries]) {
        expect(isOnBoard(entry.destination.column, entry.destination.row)).toBe(
          true,
        );
        for (const square of entry.passedOver) {
          expect(isOnBoard(square.column, square.row)).toBe(true);
        }
      }

      const unobstructedCount = destinationNames("H8", power).length;
      expect(cornerEntries.length).toBeLessThan(unobstructedCount);
      expect(edgeEntries.length).toBeLessThan(unobstructedCount);
    }
  });

  it("names the squares passed over, excluding the origin and the destination", () => {
    const origin = squareFromName("H8");

    const lEntry = reachFrom(origin, 2).find(
      (entry) => squareName(entry.destination) === "J9",
    );
    expect(lEntry).toBeDefined();
    expect(lEntry?.passedOver.map(squareName)).toEqual(["I8", "I9"]);

    const twoSquareEntry = reachFrom(origin, 2).find(
      (entry) => squareName(entry.destination) === "J8",
    );
    expect(twoSquareEntry).toBeDefined();
    expect(twoSquareEntry?.passedOver.map(squareName)).toEqual(["I8"]);

    const oneSquareEntry = reachFrom(origin, 0).find(
      (entry) => squareName(entry.destination) === "I8",
    );
    expect(oneSquareEntry).toBeDefined();
    expect(oneSquareEntry?.passedOver).toEqual([]);
  });

  it("prices every entry as §6's table prices its shape", () => {
    const costsByDestination = new Map(
      allShapesFrom(squareFromName("H8")).map((entry) => [
        squareName(entry.destination),
        entry.cost,
      ]),
    );

    for (const destination of ["G8", "I8", "H7", "H9"]) {
      expect(costsByDestination.get(destination)).toBe(0);
    }
    for (const destination of ["G7", "G9", "I7", "I9"]) {
      expect(costsByDestination.get(destination)).toBe(1);
    }
    for (const destination of ["F8", "J8", "H6", "H10"]) {
      expect(costsByDestination.get(destination)).toBe(2);
    }
    for (const destination of [
      "J9",
      "J7",
      "F9",
      "F7",
      "I10",
      "I6",
      "G10",
      "G6",
    ]) {
      expect(costsByDestination.get(destination)).toBe(2);
    }
  });

  it("gives each destination exactly one price: no two shapes share a destination", () => {
    for (const origin of ["H8", "A1", "A8", "H1", "O15"]) {
      const destinations = allShapesFrom(squareFromName(origin)).map((entry) =>
        squareName(entry.destination),
      );
      expect(new Set(destinations).size).toBe(destinations.length);
    }
  });
});

describe("the L (rules.md §6)", () => {
  const origin = squareFromName("H8");

  const EXPECTED_L_DESTINATIONS: ReadonlyArray<{
    destination: string;
    orthogonalCorner: string;
    diagonalCorner: string;
  }> = [
    { destination: "J9", orthogonalCorner: "I8", diagonalCorner: "I9" },
    { destination: "J7", orthogonalCorner: "I8", diagonalCorner: "I7" },
    { destination: "F9", orthogonalCorner: "G8", diagonalCorner: "G9" },
    { destination: "F7", orthogonalCorner: "G8", diagonalCorner: "G7" },
    { destination: "I10", orthogonalCorner: "H9", diagonalCorner: "I9" },
    { destination: "I6", orthogonalCorner: "H7", diagonalCorner: "I7" },
    { destination: "G10", orthogonalCorner: "H9", diagonalCorner: "G9" },
    { destination: "G6", orthogonalCorner: "H7", diagonalCorner: "G7" },
  ];

  it("reaches all eight L destinations from an open square, each costing 2, none affordable below that", () => {
    for (const expected of EXPECTED_L_DESTINATIONS) {
      const entry = shapeReaching(origin, squareFromName(expected.destination));
      expect(entry).toBeDefined();
      expect(entry?.cost).toBe(2);
      expect(destinationNames("H8", 1)).not.toContain(expected.destination);
      expect(destinationNames("H8", 0)).not.toContain(expected.destination);
    }
  });

  it("puts both corners in passedOver, orthogonal corner first, exactly as §6 names them", () => {
    for (const expected of EXPECTED_L_DESTINATIONS) {
      const entry = shapeReaching(origin, squareFromName(expected.destination));
      expect(entry?.passedOver.map(squareName)).toEqual([
        expected.orthogonalCorner,
        expected.diagonalCorner,
      ]);
    }
  });

  it("derives each L's corners from the sign rule (D2), independent of the literal table above", () => {
    const columnIndex = (square: Square) =>
      COLUMN_LETTERS.indexOf(square.column);
    const sign = Math.sign;

    for (const expected of EXPECTED_L_DESTINATIONS) {
      const destination = squareFromName(expected.destination);
      const deltaColumn = columnIndex(destination) - columnIndex(origin);
      const deltaRow = destination.row - origin.row;

      const orthogonalCorner =
        Math.abs(deltaColumn) === 2
          ? squareAt(
              COLUMN_LETTERS[columnIndex(origin) + sign(deltaColumn)],
              origin.row,
            )
          : squareAt(origin.column, origin.row + sign(deltaRow));
      const diagonalCorner = squareAt(
        COLUMN_LETTERS[columnIndex(origin) + sign(deltaColumn)],
        origin.row + sign(deltaRow),
      );

      expect(expected.orthogonalCorner).toBe(squareName(orthogonalCorner));
      expect(expected.diagonalCorner).toBe(squareName(diagonalCorner));
    }
  });
});

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
  actedThisPly?: readonly ShipId[];
  nodes?: Readonly<Record<string, NodeState>>;
  actionsRemaining?: number;
  plyNumber?: number;
  lengthInRounds?: number;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 2,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("legalDestinations and moveRefusalReason", () => {
  it("blocks a landing square and a longer L over it, identically for a friendly or an enemy ship", () => {
    const friendlyState = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H9")],
    });
    const enemyState = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
    });

    for (const state of [friendlyState, enemyState]) {
      const destinations = legalDestinations(state, "green-1").map(squareName);
      expect(destinations).toContain("H7");
      expect(destinations).not.toContain("H9");
      expect(destinations).not.toContain("G10");
      expect(destinations).not.toContain("I10");

      expect(moveRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
        "destination-occupied",
      );
      expect(moveRefusalReason(state, "green-1", squareFromName("G10"))).toBe(
        "path-blocked",
      );
      expect(moveRefusalReason(state, "green-1", squareFromName("I10"))).toBe(
        "path-blocked",
      );
      expect(
        moveRefusalReason(state, "green-1", squareFromName("H7")),
      ).toBeUndefined();
    }

    expect(
      legalDestinations(friendlyState, "green-1").map(squareName).sort(),
    ).toEqual(legalDestinations(enemyState, "green-1").map(squareName).sort());
  });

  it("allows a clear two-square orthogonal move and a clear L", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const destinations = legalDestinations(state, "green-1").map(squareName);

    expect(destinations).toContain("H10");
    expect(destinations).toContain("J9");
  });

  it("allows a move to end on an inactive, a depleted or a charged destination alike", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7")],
      nodes: {
        G7: "inactive",
        C7: "depleted",
        F8: "charged",
      },
    });

    const destinations = legalDestinations(state, "green-1").map(squareName);
    expect(destinations).toContain("G7");
    expect(destinations).toContain("F7");
    expect(destinations).toContain("C7");
    expect(destinations).toContain("D7");
    expect(destinations).toContain("F8");

    expect(
      moveRefusalReason(state, "green-1", squareFromName("G7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("C7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("F7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("D7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("F8")),
    ).toBeUndefined();
  });

  it("reports not-your-ship for the side not to move, and ship-already-acted for a ship that has already acted", () => {
    const notYourTurn = buildState({
      ships: [ship("green-1", "green", "H8")],
      sideToMove: "red",
    });
    expect(legalDestinations(notYourTurn, "green-1")).toEqual([]);
    expect(
      moveRefusalReason(notYourTurn, "green-1", squareFromName("H9")),
    ).toBe("not-your-ship");

    const alreadyMoved = buildState({
      ships: [ship("green-1", "green", "H8")],
      actedThisPly: ["green-1"],
    });
    expect(legalDestinations(alreadyMoved, "green-1")).toEqual([]);
    expect(
      moveRefusalReason(alreadyMoved, "green-1", squareFromName("H9")),
    ).toBe("ship-already-acted");
  });

  it("agrees with moveRefusalReason over every square on the board, across several states", () => {
    const cases: ReadonlyArray<{ state: GameState; shipId: ShipId }> = [
      {
        state: buildState({
          ships: [
            ship("green-1", "green", "H8"),
            ship("green-2", "green", "H9"),
          ],
        }),
        shipId: "green-1",
      },
      {
        state: buildState({
          ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
        }),
        shipId: "green-1",
      },
      {
        state: buildState({
          ships: [ship("green-1", "green", "E7")],
          nodes: {
            G7: "inactive",
            C7: "depleted",
            F8: "charged",
          },
        }),
        shipId: "green-1",
      },
      {
        state: buildState({
          ships: [
            ship("green-1", "green", "E7"),
            ship("green-2", "green", "A1"),
          ],
          nodes: { E7: "inactive" },
          actionsRemaining: 1,
        }),
        shipId: "green-2",
      },
    ];

    for (const { state, shipId } of cases) {
      const legalNames = new Set(
        legalDestinations(state, shipId).map(squareName),
      );

      for (const square of ALL_SQUARES) {
        const isLegal = legalNames.has(squareName(square));
        const reason = moveRefusalReason(state, shipId, square);
        expect(isLegal).toBe(reason === undefined);
      }
    }
  });

  it("produces each specific reason from at least one case", () => {
    const blocking = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H9")],
    });
    const notYourTurn = buildState({
      ships: [ship("green-1", "green", "H8")],
      sideToMove: "red",
    });
    const alreadyMoved = buildState({
      ships: [ship("green-1", "green", "H8")],
      actedThisPly: ["green-1"],
    });

    const expectations: ReadonlyArray<
      readonly [GameState, ShipId, string, MoveRefusalReason]
    > = [
      [notYourTurn, "green-1", "H9", "not-your-ship"],
      [alreadyMoved, "green-1", "H9", "ship-already-acted"],
      [blocking, "green-1", "O15", "out-of-range"],
      [blocking, "green-1", "G10", "path-blocked"],
      [blocking, "green-1", "H9", "destination-occupied"],
    ];

    for (const [state, shipId, square, reason] of expectations) {
      expect(moveRefusalReason(state, shipId, squareFromName(square))).toBe(
        reason,
      );
    }
  });
});

describe("sideToMoveHasLegalMove", () => {
  it("considers only the side to move's ships that have not yet moved", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "O15"),
      ],
      actedThisPly: ["green-2"],
    });

    expect(legalDestinations(state, "green-1").length).toBeGreaterThan(0);
    expect(legalDestinations(state, "green-2")).toEqual([]);
    expect(sideToMoveHasLegalMove(state)).toBe(true);
  });

  it("is true when the side to move has a legal move, false when it has none", () => {
    const canMove = buildState({ ships: [ship("green-1", "green", "H8")] });
    expect(sideToMoveHasLegalMove(canMove)).toBe(true);

    const cannotMove = buildState({
      ships: [ship("green-1", "green", "H8")],
      actedThisPly: ["green-1"],
    });
    expect(sideToMoveHasLegalMove(cannotMove)).toBe(false);
  });
});

describe("legalDestinations on a node that is not charged (§8.5)", () => {
  it("leaves a ship standing on a depleted node free to move a different ship, with no refusal anywhere", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      nodes: { E7: "depleted" },
      actionsRemaining: 1,
    });

    expect(legalDestinations(state, "green-2").length).toBeGreaterThan(0);
    expect(legalDestinations(state, "green-1").length).toBeGreaterThan(0);
    expect(
      moveRefusalReason(state, "green-2", squareFromName("A2")),
    ).toBeUndefined();
  });

  it("does not blow the stack: a repeated sweep completes promptly", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      nodes: { E7: "inactive" },
      actionsRemaining: 1,
    });

    for (let i = 0; i < 500; i++) {
      legalDestinations(state, "green-2");
      legalDestinations(state, "green-1");
      sideToMoveHasLegalMove(state);
    }
  });
});

describe("moveRefusalReason and legalDestinations once the game is over", () => {
  it("refuses a move that would otherwise be legal, with game-over ahead of any other reason", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 61,
    });

    expect(moveRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });

  it("refuses a move that would have been illegal anyway, still with game-over", () => {
    const outOfRange = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 61,
    });
    const notYourShip = buildState({
      ships: [ship("green-1", "green", "H8")],
      sideToMove: "red",
      plyNumber: 61,
    });

    expect(
      moveRefusalReason(outOfRange, "green-1", squareFromName("O15")),
    ).toBe("game-over");
    expect(
      moveRefusalReason(notYourShip, "green-1", squareFromName("H9")),
    ).toBe("game-over");
  });

  it("legalDestinations contains a destination legal before the game ends, and is empty in the same state once it has", () => {
    const beforeEnd = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 60,
    });
    const afterEnd: GameState = { ...beforeEnd, plyNumber: 61 };

    expect(legalDestinations(beforeEnd, "green-1").length).toBeGreaterThan(0);
    expect(legalDestinations(afterEnd, "green-1")).toEqual([]);
  });

  it("judges game-over against the state's own length, not the default", () => {
    const notOver = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 6,
      lengthInRounds: 3,
    });
    const over = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 7,
      lengthInRounds: 3,
    });

    expect(
      moveRefusalReason(notOver, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(moveRefusalReason(over, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });
});
