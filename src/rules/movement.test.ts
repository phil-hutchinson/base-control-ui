import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "./bays";
import { ALL_SQUARES, isOnBoard, squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  legalDestinations,
  type MoveRefusalReason,
  moveRefusalReason,
  reachFrom,
  sideToMoveHasLegalMove,
} from "./movement";
import type { ShieldCount } from "./shields";
import type { SiteState } from "./sites";

function destinationNames(origin: string, shields: ShieldCount): string[] {
  return reachFrom(squareFromName(origin), shields)
    .map((entry) => squareName(entry.destination))
    .sort();
}

describe("reachFrom", () => {
  it("matches §6's table exactly from an unobstructed centre square", () => {
    expect(destinationNames("H8", 4)).toEqual(["G8", "H7", "H9", "I8"].sort());

    expect(destinationNames("H8", 3)).toEqual(
      ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"].sort(),
    );

    expect(destinationNames("H8", 2)).toEqual(
      [
        "F8",
        "G7",
        "G8",
        "G9",
        "H6",
        "H7",
        "H9",
        "H10",
        "I7",
        "I8",
        "I9",
        "J8",
      ].sort(),
    );

    expect(destinationNames("H8", 1)).toEqual(
      [
        "F6",
        "F8",
        "F10",
        "G7",
        "G8",
        "G9",
        "H6",
        "H7",
        "H9",
        "H10",
        "I7",
        "I8",
        "I9",
        "J6",
        "J8",
        "J10",
      ].sort(),
    );

    expect(destinationNames("H8", 0)).toEqual(
      [
        "E8",
        "F6",
        "F8",
        "F10",
        "G7",
        "G8",
        "G9",
        "H5",
        "H6",
        "H7",
        "H9",
        "H10",
        "H11",
        "I7",
        "I8",
        "I9",
        "J6",
        "J8",
        "J10",
        "K8",
      ].sort(),
    );

    expect(destinationNames("H8", 4)).toHaveLength(4);
    expect(destinationNames("H8", 3)).toHaveLength(8);
    expect(destinationNames("H8", 2)).toHaveLength(12);
    expect(destinationNames("H8", 1)).toHaveLength(16);
    expect(destinationNames("H8", 0)).toHaveLength(20);
  });

  it("accumulates downward: each shield count's set is a superset of the next higher's", () => {
    const shieldCounts: readonly ShieldCount[] = [4, 3, 2, 1, 0];

    for (let index = 0; index < shieldCounts.length - 1; index++) {
      const fewerShieldsSet = new Set(
        destinationNames("H8", shieldCounts[index]),
      );
      const moreShieldsSet = new Set(
        destinationNames("H8", shieldCounts[index + 1]),
      );

      for (const square of fewerShieldsSet) {
        expect(moreShieldsSet.has(square)).toBe(true);
      }
    }
  });

  it("never reaches three squares diagonally, at any shield count", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      const destinations = destinationNames("H8", shields);
      expect(destinations).not.toContain("K11");
      expect(destinations).not.toContain("E5");
    }
  });

  it("is clipped by the board's edges", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      const cornerEntries = reachFrom(squareFromName("A1"), shields);
      const edgeEntries = reachFrom(squareFromName("A8"), shields);

      for (const entry of [...cornerEntries, ...edgeEntries]) {
        expect(isOnBoard(entry.destination.column, entry.destination.row)).toBe(
          true,
        );
        for (const square of entry.passedOver) {
          expect(isOnBoard(square.column, square.row)).toBe(true);
        }
      }

      const unobstructedCount = destinationNames("H8", shields).length;
      expect(cornerEntries.length).toBeLessThan(unobstructedCount);
      expect(edgeEntries.length).toBeLessThan(unobstructedCount);
    }
  });

  it("names the squares passed over, excluding the origin and the destination", () => {
    const origin = squareFromName("H8");

    const threeSquareEntry = reachFrom(origin, 0).find(
      (entry) => squareName(entry.destination) === "K8",
    );
    expect(threeSquareEntry).toBeDefined();
    expect(threeSquareEntry?.passedOver.map(squareName)).toEqual(["I8", "J8"]);

    const twoSquareEntry = reachFrom(origin, 2).find(
      (entry) => squareName(entry.destination) === "J8",
    );
    expect(twoSquareEntry).toBeDefined();
    expect(twoSquareEntry?.passedOver.map(squareName)).toEqual(["I8"]);

    const oneSquareEntry = reachFrom(origin, 4).find(
      (entry) => squareName(entry.destination) === "I8",
    );
    expect(oneSquareEntry).toBeDefined();
    expect(oneSquareEntry?.passedOver).toEqual([]);
  });
});

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
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("legalDestinations and moveRefusalReason", () => {
  it("blocks a landing square and a longer move over it, identically for a friendly or an enemy ship", () => {
    const friendlyState = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H10")],
    });
    const enemyState = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H10")],
    });

    for (const state of [friendlyState, enemyState]) {
      const destinations = legalDestinations(state, "green-1").map(squareName);
      expect(destinations).toContain("H9");
      expect(destinations).not.toContain("H10");
      expect(destinations).not.toContain("H11");

      expect(moveRefusalReason(state, "green-1", squareFromName("H10"))).toBe(
        "destination-occupied",
      );
      expect(moveRefusalReason(state, "green-1", squareFromName("H11"))).toBe(
        "path-blocked",
      );
      expect(
        moveRefusalReason(state, "green-1", squareFromName("H9")),
      ).toBeUndefined();
    }

    expect(
      legalDestinations(friendlyState, "green-1").map(squareName).sort(),
    ).toEqual(legalDestinations(enemyState, "green-1").map(squareName).sort());
  });

  it("allows a clear path of two squares and of three squares", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const destinations = legalDestinations(state, "green-1").map(squareName);

    expect(destinations).toContain("H10");
    expect(destinations).toContain("H11");
  });

  it("excludes a dormant or depleted destination, allows flying over either, and allows an active or charged destination", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7")],
      siteStates: {
        G7: "dormant",
        C7: "depleted",
        E9: "active",
        G9: "charged",
      },
    });

    const destinations = legalDestinations(state, "green-1").map(squareName);
    expect(destinations).not.toContain("G7");
    expect(destinations).toContain("H7");
    expect(destinations).not.toContain("C7");
    expect(destinations).toContain("B7");
    expect(destinations).toContain("E9");
    expect(destinations).toContain("G9");

    expect(moveRefusalReason(state, "green-1", squareFromName("G7"))).toBe(
      "destination-dormant-site",
    );
    expect(moveRefusalReason(state, "green-1", squareFromName("C7"))).toBe(
      "destination-depleted-site",
    );
    expect(
      moveRefusalReason(state, "green-1", squareFromName("H7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("B7")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("E9")),
    ).toBeUndefined();
    expect(
      moveRefusalReason(state, "green-1", squareFromName("G9")),
    ).toBeUndefined();
  });

  it("reports not-your-ship for the side not to move, and ship-already-moved for a ship that has already moved", () => {
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
      movedThisPly: ["green-1"],
    });
    expect(legalDestinations(alreadyMoved, "green-1")).toEqual([]);
    expect(
      moveRefusalReason(alreadyMoved, "green-1", squareFromName("H9")),
    ).toBe("ship-already-moved");
  });

  it("agrees with moveRefusalReason over every square on the board, across several states", () => {
    const cases: ReadonlyArray<{ state: GameState; shipId: ShipId }> = [
      {
        state: buildState({
          ships: [
            ship("green-1", "green", "H8"),
            ship("green-2", "green", "H10"),
          ],
        }),
        shipId: "green-1",
      },
      {
        state: buildState({
          ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H10")],
        }),
        shipId: "green-1",
      },
      {
        state: buildState({
          ships: [ship("green-1", "green", "E7")],
          siteStates: {
            G7: "dormant",
            C7: "depleted",
            E9: "active",
            G9: "charged",
          },
        }),
        shipId: "green-1",
      },
      {
        // green-2 is not stranded, but green-1 is, and the obligation binds
        // from the first action — so every square is refused for green-2.
        state: buildState({
          ships: [
            ship("green-1", "green", "E7"),
            ship("green-2", "green", "A1"),
          ],
          siteStates: { E7: "dormant" },
          actionsRemaining: 2,
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
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H10")],
    });
    const sites = buildState({
      ships: [ship("green-1", "green", "E7")],
      siteStates: { G7: "dormant", C7: "depleted" },
    });
    const notYourTurn = buildState({
      ships: [ship("green-1", "green", "H8")],
      sideToMove: "red",
    });
    const alreadyMoved = buildState({
      ships: [ship("green-1", "green", "H8")],
      movedThisPly: ["green-1"],
    });
    const stranded = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });

    const expectations: ReadonlyArray<
      readonly [GameState, ShipId, string, MoveRefusalReason]
    > = [
      [notYourTurn, "green-1", "H9", "not-your-ship"],
      [alreadyMoved, "green-1", "H9", "ship-already-moved"],
      [stranded, "green-2", "A2", "another-ship-stranded"],
      [blocking, "green-1", "O15", "out-of-range"],
      [blocking, "green-1", "H11", "path-blocked"],
      [blocking, "green-1", "H10", "destination-occupied"],
      [sites, "green-1", "G7", "destination-dormant-site"],
      [sites, "green-1", "C7", "destination-depleted-site"],
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
      movedThisPly: ["green-2"],
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
      movedThisPly: ["green-1"],
    });
    expect(sideToMoveHasLegalMove(cannotMove)).toBe(false);
  });

  it("stays unaffected by the §8.5 obligation: a side that can move can still move", () => {
    // green-1 is stranded on a dormant site and the obligation binds, so
    // moving green-2 is refused — but the side still has a legal move
    // (green-1's own), so the §5 pass guard must not fire.
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });

    expect(moveRefusalReason(state, "green-2", squareFromName("A2"))).toBe(
      "another-ship-stranded",
    );
    expect(sideToMoveHasLegalMove(state)).toBe(true);
  });
});

describe("legalDestinations and the §8.5 obligation", () => {
  it("stays unrestricted when no ship is stranded", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      actionsRemaining: 2,
    });

    expect(legalDestinations(state, "green-2").length).toBeGreaterThan(0);
    expect(legalDestinations(state, "green-1").length).toBeGreaterThan(0);
  });

  it("empties for a non-owed ship from the first action with one stranded ship, and stays open for the owed one", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      actionsRemaining: 2,
    });

    expect(legalDestinations(state, "green-2")).toEqual([]);
    expect(legalDestinations(state, "green-1").length).toBeGreaterThan(0);
  });

  it("reopens for the rest of the fleet once the stranded ship has moved", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7"), ship("green-2", "green", "A1")],
      siteStates: { E7: "dormant" },
      movedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(legalDestinations(state, "green-2").length).toBeGreaterThan(0);
  });

  it("does not blow the stack: a repeated sweep completes promptly", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E7"),
        ship("green-2", "green", "A1"),
        ship("green-3", "green", "D1"),
      ],
      siteStates: { E7: "dormant" },
      actionsRemaining: 1,
    });

    for (let i = 0; i < 500; i++) {
      legalDestinations(state, "green-2");
      legalDestinations(state, "green-1");
      sideToMoveHasLegalMove(state);
    }
  });
});
