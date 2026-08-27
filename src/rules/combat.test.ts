import { describe, expect, it } from "vitest";
import { BAYS, isBay } from "./bays";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  squareAt,
  squareFromName,
  squareName,
} from "./board";
import {
  attackReach,
  attackRefusalReason,
  drawReturnBay,
  legalTargets,
  resolveFight,
  sevenOnlyAttackRefusalReason,
  sevenOnlyLegalTargets,
  winnerAdvance,
} from "./combat";
import type { ShipId } from "./fleet";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { type ReachEntry, reachFrom } from "./moveLegality";
import { MAX_SHIELDS, MIN_SHIELDS, type ShieldCount } from "./shields";
import { SITES } from "./sites";
import type { SiteState } from "./sites";

const ALL_SHIELD_COUNTS: readonly ShieldCount[] = [0, 1, 2, 3, 4];

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
          ship("red-1", "red", "H10", 0),
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
          ship("green-1", "green", "H8", 1),
          ship("red-1", "red", "J10", 0),
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
          ship("green-1", "green", "H8", 4),
          ship("red-1", "red", "A1", 0),
        ],
      }),
      "green-1",
      squareFromName("A1"),
    );

    expect(entry).toBeUndefined();
  });
});

describe("sevenOnlyAttackRefusalReason / sevenOnlyLegalTargets", () => {
  it("a 4-shield ship's targets are its four orthogonal neighbours, and never a diagonal one", () => {
    const orthogonalNeighbours = ["G8", "I8", "H7", "H9"];
    const diagonalNeighbours = ["G7", "G9", "I7", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 4),
        ...orthogonalNeighbours.map((square, index) =>
          ship(`red-o-${index}`, "red", square, 0),
        ),
        ...diagonalNeighbours.map((square, index) =>
          ship(`red-d-${index}`, "red", square, 0),
        ),
      ],
    });

    expect(squareNames(sevenOnlyLegalTargets(state, "green-1"))).toEqual(
      squareNames(orthogonalNeighbours.map(squareFromName)),
    );
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("G7")),
    ).toBe("target-out-of-range");
  });

  it("a 3-shield ship's targets are exactly the eight neighbours around it", () => {
    const neighbours = ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ...neighbours.map((square, index) =>
          ship(`red-${index}`, "red", square, 0),
        ),
      ],
    });

    expect(squareNames(sevenOnlyLegalTargets(state, "green-1"))).toEqual(
      squareNames(neighbours.map(squareFromName)),
    );
  });

  it("an unshielded ship can attack three squares orthogonally and two diagonally", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-orthogonal", "red", "H11", 0),
        ship("red-diagonal", "red", "J10", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H11")),
    ).toBeUndefined();
    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("J10")),
    ).toBeUndefined();
  });

  it("refuses attack-path-blocked when a ship of either side stands between attacker and target, and the same attack is legal once that square is empty", () => {
    const withBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 0),
        ship("red-1", "red", "H10", 0),
      ],
    });
    const withEnemyBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-blocker", "red", "H9", 0),
        ship("red-1", "red", "H10", 0),
      ],
    });
    const cleared = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-1", "red", "H10", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(
        withBlocker,
        "green-1",
        squareFromName("H10"),
      ),
    ).toBe("attack-path-blocked");
    expect(
      sevenOnlyAttackRefusalReason(
        withEnemyBlocker,
        "green-1",
        squareFromName("H10"),
      ),
    ).toBe("attack-path-blocked");
    expect(
      sevenOnlyAttackRefusalReason(cleared, "green-1", squareFromName("H10")),
    ).toBeUndefined();
  });

  it("refuses target-out-of-range for a target beyond the reach", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 4),
        ship("red-1", "red", "H11", 0),
      ],
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H11")),
    ).toBe("target-out-of-range");
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

  it("refuses a ship that has already acted this ply, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 0)],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(
      sevenOnlyAttackRefusalReason(state, "green-1", squareFromName("H9")),
    ).toBe("ship-already-acted");
    expect(sevenOnlyLegalTargets(state, "green-1")).toEqual([]);
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

  it("attacks are legal again for the rest of the side once the freeing move is made, but not with the ship that just made it: one action per ship (rules.md §5)", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "E8", 4),
        ship("green-2", "green", "B2", 2),
        ship("red-1", "red", "E9", 0),
        ship("red-2", "red", "B1", 0),
      ],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("E9"))).toBe(
      "ship-already-acted",
    );
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
      actionsRemaining: 1,
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(
      attackRefusalReason(state, "green-2", squareFromName("B1")),
    ).toBeUndefined();
  });
});

describe("attackRefusalReason and legalTargets once the game is over", () => {
  it("refuses an attack that would otherwise be legal, with game-over ahead of any other reason", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 0)],
      plyNumber: 201,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });

  it("refuses an attack that would have been illegal anyway, still with game-over", () => {
    const notAdjacent = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "K5", 0)],
      plyNumber: 201,
    });
    const notYourShip = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 0)],
      sideToMove: "red",
      plyNumber: 201,
    });

    expect(
      attackRefusalReason(notAdjacent, "green-1", squareFromName("K5")),
    ).toBe("game-over");
    expect(
      attackRefusalReason(notYourShip, "green-1", squareFromName("H9")),
    ).toBe("game-over");
  });

  it("empties legalTargets while the §7-only layer stays unchanged, pinning the layering", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 0)],
      plyNumber: 201,
    });

    expect(legalTargets(state, "green-1")).toEqual([]);
    expect(sevenOnlyLegalTargets(state, "green-1").length).toBeGreaterThan(0);
  });

  it("judges game-over against the state's own length, not the default", () => {
    const notOver = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 0)],
      plyNumber: 6,
      lengthInRounds: 3,
    });
    const over = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 0)],
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

describe("resolveFight", () => {
  it("decides every combination of 0-4 against 0-4 against winner - (loser + 1)", () => {
    for (const attackerShields of ALL_SHIELD_COUNTS) {
      for (const defenderShields of ALL_SHIELD_COUNTS) {
        const outcome = resolveFight(attackerShields, defenderShields);

        if (attackerShields === defenderShields) {
          expect(outcome).toEqual({ result: "mutual-return" });
          continue;
        }

        if (attackerShields > defenderShields) {
          expect(outcome).toEqual({
            result: "attacker-won",
            winnerRemainingShields: attackerShields - (defenderShields + 1),
          });
        } else {
          expect(outcome).toEqual({
            result: "defender-won",
            winnerRemainingShields: defenderShields - (attackerShields + 1),
          });
        }

        if (outcome.result !== "mutual-return") {
          expect(outcome.winnerRemainingShields).toBeGreaterThanOrEqual(
            MIN_SHIELDS,
          );
          expect(outcome.winnerRemainingShields).toBeLessThan(MAX_SHIELDS);
        }
      }
    }
  });

  it("costs exactly one shield to beat a 0-shield ship", () => {
    expect(resolveFight(1, 0)).toEqual({
      result: "attacker-won",
      winnerRemainingShields: 0,
    });
  });

  it("leaves a 4-shield ship on 1 after beating a 2-shield ship (§7's worked example)", () => {
    expect(resolveFight(4, 2)).toEqual({
      result: "attacker-won",
      winnerRemainingShields: 1,
    });
  });

  it("lets the defender win, and pay, when it is the stronger side", () => {
    expect(resolveFight(0, 3)).toEqual({
      result: "defender-won",
      winnerRemainingShields: 2,
    });
  });
});

describe("drawReturnBay", () => {
  it("always draws a bay that was empty in the state drawn against", () => {
    const state = buildState({
      ships: [
        ship("red-1", "red", "H15", 0),
        ship("red-2", "red", "L15", 0),
        ship("red-3", "red", "O14", 0),
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
        ship(`red-${index}`, "red", squareName(square), 0),
      ),
    });

    for (let seed = 0; seed < 50; seed++) {
      const [bay] = drawReturnBay({ ...state, randomSeed: seed });
      expect(squareName(bay)).toBe("H15");
    }
  });

  it("gives the same bay for the same seed", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H15", 0)],
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
      ships: [ship("red-1", "red", "H15", 0)],
    });
    const [occupiedBay] = drawReturnBay(occupiedState);
    expect(squareName(occupiedBay)).not.toBe("H15");

    const vacatedState = buildState({
      ships: [ship("red-1", "red", "E7", 0)],
    });
    const otherOccupiedBays = BAYS.filter(
      (square) => squareName(square) !== "H15",
    );
    const fullyVacatedExceptOne: GameState = {
      ...vacatedState,
      ships: [
        ship("red-1", "red", "E7", 0),
        ...otherOccupiedBays.map((square, index) =>
          ship(`red-${index + 2}`, "red", squareName(square), 0),
        ),
      ],
    };
    const [vacatedBay] = drawReturnBay(fullyVacatedExceptOne);
    expect(squareName(vacatedBay)).toBe("H15");
  });

  it("throws naming §7.1 when every bay is occupied", () => {
    const state = buildState({
      ships: BAYS.map((square, index) =>
        ship(`red-${index}`, "red", squareName(square), 0),
      ),
    });

    expect(() => drawReturnBay(state)).toThrow(/§7\.1/);
  });

  it("spreads draws over chained seeds across every empty bay, never an occupied one (D11 coverage sweep)", () => {
    const occupiedBays = new Set(["H15", "O14", "O6", "D1", "A6"]);
    const state = buildState({
      ships: [...occupiedBays].map((name, index) =>
        ship(`red-${index}`, "red", name, 0),
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

describe("winnerAdvance", () => {
  function laneOf(origin: string, destination: string): ReachEntry {
    const attacker = ship("green-1", "green", origin, 0);
    const entry = reachFrom(attacker.square, 0).find(
      (candidate) => squareName(candidate.destination) === destination,
    );
    if (entry === undefined) {
      throw new Error(`no reach entry from ${origin} to ${destination}`);
    }
    return entry;
  }

  it("lands on the loser's square when it is ordinary ground", () => {
    const state = buildState({ ships: [] });
    const advance = winnerAdvance(state, laneOf("H5", "H8"));

    expect(advance).toBeDefined();
    expect(squareName(advance!.destination)).toBe("H8");
    expect(squareNames(advance!.passedOver)).toEqual(["H6", "H7"]);
  });

  it("stops one square short when the loser's square is a dead site", () => {
    const state = buildState({ ships: [], siteStates: { H8: "dormant" } });
    const advance = winnerAdvance(state, laneOf("H5", "H8"));

    expect(advance).toBeDefined();
    expect(squareName(advance!.destination)).toBe("H7");
    expect(squareNames(advance!.passedOver)).toEqual(["H6"]);
  });

  it("stops two squares short when the loser's square and the one before it are both dead", () => {
    const state = buildState({
      ships: [],
      siteStates: { H7: "depleted", H8: "dormant" },
    });
    const advance = winnerAdvance(state, laneOf("H5", "H8"));

    expect(advance).toBeDefined();
    expect(squareName(advance!.destination)).toBe("H6");
    expect(squareNames(advance!.passedOver)).toEqual([]);
  });

  it("holds its ground when the only square on the lane is dead", () => {
    const state = buildState({ ships: [], siteStates: { H6: "dormant" } });
    const advance = winnerAdvance(state, laneOf("H5", "H6"));

    expect(advance).toBeUndefined();
  });

  it("never lands the winner in a bay, swept across every non-bay origin, every shield count and every lane it offers whose target is itself not a bay, under two extreme site configurations", () => {
    // A lane whose destination is a bay is not one `winnerAdvance` is ever
    // handed in real play: `sevenOnlyAttackRefusalReason` refuses a bay
    // target (rules.md §3.1) before `attackReach`'s lane is ever passed to
    // it. The sweep mirrors that precondition rather than re-deriving it.
    const allDepleted = siteStatuses(
      Object.fromEntries(
        SITES.map((site) => [squareName(site), "depleted" as SiteState]),
      ),
    );
    const allActive = siteStatuses(
      Object.fromEntries(
        SITES.map((site) => [squareName(site), "active" as SiteState]),
      ),
    );

    for (const siteStates of [allDepleted, allActive]) {
      const state: GameState = { ...buildState({ ships: [] }), siteStates };

      for (const column of COLUMN_LETTERS) {
        for (let row = 1; row <= BOARD_SIZE; row++) {
          const origin = squareAt(column, row);
          if (isBay(origin)) {
            continue;
          }

          for (const shields of ALL_SHIELD_COUNTS) {
            for (const reach of reachFrom(origin, shields)) {
              if (isBay(reach.destination)) {
                continue;
              }

              const advance = winnerAdvance(state, reach);
              if (advance !== undefined) {
                expect(isBay(advance.destination)).toBe(false);
              }
            }
          }
        }
      }
    }
  });
});
