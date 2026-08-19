import { describe, expect, it } from "vitest";
import { CLOCKWISE_BAYS, STARTING_RETURN_POSITION_INDEX } from "./bays";
import { type Square, squareFromName, squareName } from "./board";
import {
  adjacentSquares,
  attackRefusalReason,
  legalTargets,
  receptacleBay,
  resolveFight,
  returnPositionSquare,
  sevenOnlyAttackRefusalReason,
  sevenOnlyLegalTargets,
} from "./combat";
import type { ShipId } from "./fleet";
import { startingGameState } from "./gameState";
import type { GameState, Ship, SiteStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { reachFrom } from "./movement";
import { MAX_SHIELDS, MIN_SHIELDS, type ShieldCount } from "./shields";
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
  movedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
  actionsRemaining?: number;
  returnPositionIndex?: number;
  plyNumber?: number;
  lengthInRounds?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 2,
    movedThisPly: config.movedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    returnPositionIndex:
      config.returnPositionIndex ?? STARTING_RETURN_POSITION_INDEX,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
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

describe("returnPositionSquare / receptacleBay", () => {
  it("names H15 as position 1 in a starting state", () => {
    expect(squareName(returnPositionSquare(startingGameState(1)))).toBe("H15");
  });

  it("gives position 1 itself as the receptacle when it is empty", () => {
    const state = buildState({ ships: [] });
    expect(squareName(receptacleBay(state))).toBe("H15");
  });

  it("gives the next bay clockwise when position 1 is occupied", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H15", 0)],
    });
    expect(squareName(receptacleBay(state))).toBe("L15");
  });

  it("gives the bay after that when the first two are occupied", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H15", 0), ship("red-2", "red", "L15", 0)],
    });
    expect(squareName(receptacleBay(state))).toBe("O14");
  });

  it("wraps around the end of the ring back to position 1", () => {
    const lastRingIndex = CLOCKWISE_BAYS.length - 1;
    const state = buildState({
      ships: [
        ship("red-1", "red", squareName(CLOCKWISE_BAYS[lastRingIndex]), 0),
      ],
      returnPositionIndex: lastRingIndex,
    });
    expect(squareName(receptacleBay(state))).toBe("H15");
  });

  it("is live: moving a ship out of what would be the first bay changes the answer", () => {
    const occupiedState = buildState({
      ships: [ship("red-1", "red", "H15", 0)],
    });
    expect(squareName(receptacleBay(occupiedState))).toBe("L15");

    const vacatedState = buildState({
      ships: [ship("red-1", "red", "E7", 0)],
    });
    expect(squareName(receptacleBay(vacatedState))).toBe("H15");
  });
});
