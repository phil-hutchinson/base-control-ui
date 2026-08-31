import { describe, expect, it } from "vitest";
import { BAYS, isBay } from "./bays";
import { squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type SiteStatus,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  applyAttack,
  applyMove,
  applyPassGuard,
  assertFightInvariants,
} from "./ply";
import type { PowerLevel } from "./power";
import { drawIndex } from "./random";
import {
  drawTableAmount,
  EMPTY_NODE_DRAIN_TABLE,
  type SiteState,
} from "./sites";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState | readonly [SiteState, number]>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, entry]) => {
      const [state, level] = Array.isArray(entry) ? entry : [entry, 0];
      return [name, { state, level }];
    }),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actionsRemaining?: number;
  actedThisPly?: readonly ShipId[];
  siteStates?: Readonly<
    Record<string, SiteState | readonly [SiteState, number]>
  >;
  plyNumber?: number;
  lengthInRounds?: number;
  energy?: { green: number; red: number };
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? ACTIONS_PER_PLY,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("applyMove", () => {
  it("moves the ship and touches nothing else", () => {
    // E6 is not one of the seventeen sites (rules.md §3.2), so it is
    // immune to the end-of-turn drain and recovery this move's own ply-end
    // triggers — this test is about the move itself, not about the board's
    // own per-turn dynamics.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      siteStates: { E6: "dormant" },
    });
    const before = structuredClone(state);

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("H9"));

    const other = result.state.ships.find((s) => s.id === "red-1");
    expect(other).toEqual(ship("red-1", "red", "A1"));

    expect(result.state.siteStates).toEqual(state.siteStates);

    // The input state itself is never mutated.
    expect(state).toEqual(before);
  });

  it("refills power to full when a move ends in a bay, but not when it only passes over one", () => {
    const endsInBay = buildState({
      ships: [ship("green-1", "green", "A11", 2)],
    });
    const endResult = applyMove(endsInBay, "green-1", squareFromName("A10"));
    expect(endResult.outcome).toBe("applied");
    if (endResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const landedShip = endResult.state.ships.find((s) => s.id === "green-1");
    expect(landedShip?.power).toBe(4);
    expect(endResult.effects).toContainEqual({
      type: "power-reset",
      shipId: "green-1",
    });

    const passesOverBay = buildState({
      ships: [ship("green-1", "green", "A11", 2)],
    });
    const passResult = applyMove(
      passesOverBay,
      "green-1",
      squareFromName("A9"),
    );
    expect(passResult.outcome).toBe("applied");
    if (passResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const flownShip = passResult.state.ships.find((s) => s.id === "green-1");
    expect(flownShip?.power).toBe(2);
    expect(passResult.effects).not.toContainEqual(
      expect.objectContaining({ type: "power-reset" }),
    );
  });

  it("does not report a power-reset effect for a ship already at full power", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A11", 4)],
    });
    const result = applyMove(state, "green-1", squareFromName("A10"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const landedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(landedShip?.power).toBe(4);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "power-reset" }),
    );
  });

  it("landing on a charged site leaves it charged: nothing a ship does changes a site's state (rules.md §8.2)", () => {
    // A ship may only ever end a move on a charged site (rules.md §6) — an
    // active or dormant destination is refused before it can be reached.
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { K8: ["charged", 1] },
      plyNumber: 5,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.K8).toEqual(state.siteStates.K8);
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("K8"));
  });

  it("flying over an active site without stopping leaves it active (rules.md §8.2)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { I8: "active" },
      plyNumber: 3,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.I8).toEqual(state.siteStates.I8);
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("K8"));
  });

  it("leaves an active site flown over unaffected", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { I8: ["active", 1] },
      plyNumber: 4,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.I8).toEqual(state.siteStates.I8);
  });

  it("leaves siteStates deeply unchanged when a move touches no site", () => {
    // E6 is not one of the seventeen sites (rules.md §3.2), so it is
    // immune to the drain and recovery every end-of-turn sequence now runs
    // (rules.md §8.2, §8.3) — the "unchanged" under test here is about the
    // move itself, not about the board's own per-turn dynamics, which run
    // regardless of what a ship does (see endOfTurn.test.ts).
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { E6: "dormant" },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates).toEqual(state.siteStates);
  });

  it("refuses an illegal destination, leaving the state exactly as it went in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "H9")],
    });
    const before = structuredClone(state);

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "destination-occupied",
    });
    expect(state).toEqual(before);
  });

  it("gives green the first ply", () => {
    expect(startingGameState(1).sideToMove).toBe("green");
    expect(startingGameState(1).actionsRemaining).toBe(ACTIONS_PER_PLY);
  });

  it("spends the ply's one action before passing the turn, then clears the moved-this-ply marks", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O15")],
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.actedThisPly).toEqual([]);
    expect(result.state.plyNumber).toBe(2);
    expect(result.effects).toEqual([
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("refuses a second move of a ship that has already acted this ply, but allows it again next ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const refused = applyMove(state, "green-1", squareFromName("H9"));
    expect(refused).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    // Green's next ply: its action is available again, nothing moved yet.
    const nextPly = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
    });
    const allowedAgain = applyMove(nextPly, "green-1", squareFromName("H9"));
    expect(allowedAgain.outcome).toBe("applied");
  });

  it("refuses a move of a ship belonging to the side not to move", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      sideToMove: "red",
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));
    expect(result).toEqual({ outcome: "refused", reason: "not-your-ship" });
  });
});

describe("applyAttack", () => {
  it.each([
    {
      label: "0 against 4",
      attackerPower: 0 as PowerLevel,
      defenderPower: 4 as PowerLevel,
    },
    {
      label: "2 against 2",
      attackerPower: 2 as PowerLevel,
      defenderPower: 2 as PowerLevel,
    },
    {
      label: "4 against 0",
      attackerPower: 4 as PowerLevel,
      defenderPower: 0 as PowerLevel,
    },
  ])(
    "sends both ships home at full power and leaves both squares empty, whatever power either side carries ($label)",
    ({ attackerPower, defenderPower }) => {
      const state = buildState({
        ships: [
          ship("green-1", "green", "H8", attackerPower),
          ship("red-1", "red", "H9", defenderPower),
        ],
      });
      const before = structuredClone(state);

      const result = applyAttack(state, "green-1", squareFromName("H9"));

      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attacker = result.state.ships.find((s) => s.id === "green-1");
      const defender = result.state.ships.find((s) => s.id === "red-1");
      expect(attacker?.power).toBe(4);
      expect(defender?.power).toBe(4);
      expect(isBay(attacker!.square)).toBe(true);
      expect(isBay(defender!.square)).toBe(true);
      expect(squareName(attacker!.square)).not.toBe(
        squareName(defender!.square),
      );

      const occupiedSquareNames = result.state.ships.map((s) =>
        squareName(s.square),
      );
      expect(occupiedSquareNames).not.toContain("H8");
      expect(occupiedSquareNames).not.toContain("H9");

      expect(result.effects[0]).toEqual({
        type: "fight-resolved",
        attacker: {
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          power: attackerPower,
        },
        defender: {
          shipId: "red-1",
          side: "red",
          square: squareFromName("H9"),
          power: defenderPower,
        },
        returns: [
          {
            shipId: "green-1",
            side: "green",
            from: squareFromName("H8"),
            to: attacker!.square,
          },
          {
            shipId: "red-1",
            side: "red",
            from: squareFromName("H9"),
            to: defender!.square,
          },
        ],
      });

      // The input state itself is never mutated.
      expect(state).toEqual(before);
    },
  );

  it("draws the attacker's bay first, pinned to a stated seed", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });

    // Both bays are empty before the fight, so the attacker's draw picks
    // from all fourteen; the defender's draw is then made against the pool
    // with the attacker's bay removed.
    const [attackerIndex, seedAfterAttackerDraw] = drawIndex(
      state.randomSeed,
      BAYS.length,
    );
    const attackerBayName = squareName(BAYS[attackerIndex]);
    const defenderPool = BAYS.filter(
      (square) => squareName(square) !== attackerBayName,
    );
    const [defenderIndex] = drawIndex(
      seedAfterAttackerDraw,
      defenderPool.length,
    );
    const defenderBayName = squareName(defenderPool[defenderIndex]);

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(
      squareName(result.state.ships.find((s) => s.id === "green-1")!.square),
    ).toBe(attackerBayName);
    expect(
      squareName(result.state.ships.find((s) => s.id === "red-1")!.square),
    ).toBe(defenderBayName);
  });

  it("keeps the fleet the same size on each side, across a sequence of fights", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "A1", 3),
        ship("green-3", "green", "A3"),
        ship("green-4", "green", "A5"),
        ship("green-5", "green", "A7"),
        ship("green-6", "green", "A9"),
        ship("green-7", "green", "A11"),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 3),
        ship("red-3", "red", "B3"),
        ship("red-4", "red", "B5"),
        ship("red-5", "red", "B7"),
        ship("red-6", "red", "B9"),
        ship("red-7", "red", "B11"),
      ],
    });

    // Green's one action ends its ply, so the second fight is red's own
    // action on the following ply, not a second green action.
    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.sideToMove).toBe("red");
    const countBySide = (s: GameState, side: "green" | "red") =>
      s.ships.filter((ship) => ship.side === side).length;
    expect(countBySide(first.state, "green")).toBe(7);
    expect(countBySide(first.state, "red")).toBe(7);

    const second = applyAttack(first.state, "red-2", squareFromName("A1"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(countBySide(second.state, "green")).toBe(7);
    expect(countBySide(second.state, "red")).toBe(7);
    expect(second.state.ships.length).toBe(14);
  });

  it("recomputes the return bay live: a bay an earlier ply's move vacated is one of the two a fight's ships land in", () => {
    // green-2 sits in H15, one of the two bays left empty once green-2
    // moves out of it (L15 is the other); green-1 and red-1 are positioned
    // for the fight the next ply brings.
    const state = buildState({
      ships: [
        ship("green-2", "green", "H15", 0),
        ship("green-1", "green", "H9", 4),
        ship("red-1", "red", "H8", 1),
        ...BAYS.filter(
          (square) => !["H15", "L15"].includes(squareName(square)),
        ).map((square, index) =>
          ship(`bay-filler-${index}`, "red", squareName(square)),
        ),
      ],
    });

    const vacated = applyMove(state, "green-2", squareFromName("H14"));
    expect(vacated.outcome).toBe("applied");
    if (vacated.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(vacated.state.sideToMove).toBe("red");

    // H15 and L15 are now the only empty bays, so the fight's two returning
    // ships must land there between them, whichever seed drew them.
    const result = applyAttack(vacated.state, "red-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const returnedSquareNames = new Set(
      ["green-1", "red-1"].map((id) =>
        squareName(result.state.ships.find((s) => s.id === id)!.square),
      ),
    );
    expect(returnedSquareNames).toEqual(new Set(["H15", "L15"]));
  });

  it("advances randomSeed exactly twice for every fight", () => {
    // Drawing the second return from the same seed the first draw used
    // would silently break replay: the pool is just one square shorter, so
    // the draw still looks legal.
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });
    const result = applyAttack(state, "green-1", squareFromName("H9"));
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    // Both bays start empty, so the attacker's draw picks from all fourteen
    // and the defender's draw — against the state that already holds the
    // attacker — picks from the remaining thirteen.
    const [, seedAfterAttackerDraw] = drawIndex(state.randomSeed, BAYS.length);
    const [, seedAfterDefenderDraw] = drawIndex(
      seedAfterAttackerDraw,
      BAYS.length - 1,
    );
    expect(result.state.randomSeed).toBe(seedAfterDefenderDraw);
  });

  it("places both ships in different bays, whatever the seed, when exactly two bays are empty", () => {
    const emptyBayNames = ["H15", "L15"];
    const bayOccupants = BAYS.filter(
      (square) => !emptyBayNames.includes(squareName(square)),
    ).map((square, index) =>
      ship(`bay-filler-${index}`, "red", squareName(square)),
    );

    for (const seed of [1, 2, 3, 42, 999]) {
      const state: GameState = {
        ...buildState({
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
            ...bayOccupants,
          ],
        }),
        randomSeed: seed,
      };
      const result = applyAttack(state, "green-1", squareFromName("H9"));
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attackerSquareName = squareName(
        result.state.ships.find((s) => s.id === "green-1")!.square,
      );
      const defenderSquareName = squareName(
        result.state.ships.find((s) => s.id === "red-1")!.square,
      );
      expect(new Set([attackerSquareName, defenderSquareName])).toEqual(
        new Set(emptyBayNames),
      );
    }
  });

  it("never lands a fight's two ships on the same bay, swept over many chained seeds with several bays empty", () => {
    const emptyBayNames = ["H15", "L15", "O14", "O10", "A2"];
    const bayOccupants = BAYS.filter(
      (square) => !emptyBayNames.includes(squareName(square)),
    ).map((square, index) =>
      ship(`bay-filler-${index}`, "red", squareName(square)),
    );

    let seed = 7;
    for (let round = 0; round < 200; round++) {
      const state: GameState = {
        ...buildState({
          ships: [
            ship("green-1", "green", "H8", 2),
            ship("red-1", "red", "H9", 2),
            ...bayOccupants,
          ],
        }),
        randomSeed: seed,
      };
      const result = applyAttack(state, "green-1", squareFromName("H9"));
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const attacker = result.state.ships.find((s) => s.id === "green-1")!;
      const defender = result.state.ships.find((s) => s.id === "red-1")!;
      expect(squareName(attacker.square)).not.toBe(squareName(defender.square));
      seed = result.state.randomSeed;
    }
  });

  it("refuses a second attack attempt by a ship that has already acted this ply, even with a fresh target in range", () => {
    // Built directly rather than played into (rules.md §5): one action
    // per turn always ends the ply, so a ship that has already acted is
    // never seen again — by its own side — until the side's next turn.
    // This stands for the moment right after green-1's fight at H9.
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 2), ship("red-2", "red", "G9", 4)],
      actedThisPly: ["green-1"],
    });

    const attempt = applyAttack(state, "green-1", squareFromName("G9"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses a move by a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 3)],
      actedThisPly: ["green-1"],
    });

    const attempt = applyMove(state, "green-1", squareFromName("H10"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an attack by a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 4), ship("red-1", "red", "H10")],
      actedThisPly: ["green-1"],
    });

    const attempt = applyAttack(state, "green-1", squareFromName("H10"));

    expect(attempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("lets a ship on each side attack in turn, one action per round", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 4),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 4),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.sideToMove).toBe("red");

    const second = applyAttack(first.state, "red-2", squareFromName("A1"));
    expect(second.outcome).toBe("applied");
  });

  it("lets one side move and the other attack, in either order, as a round's two actions", () => {
    const moveThenAttack = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 4),
        ship("red-1", "red", "B1", 4),
      ],
    });
    const firstMove = applyMove(
      moveThenAttack,
      "green-1",
      squareFromName("H9"),
    );
    expect(firstMove.outcome).toBe("applied");
    if (firstMove.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(firstMove.state.sideToMove).toBe("red");
    const secondAttack = applyAttack(
      firstMove.state,
      "red-1",
      squareFromName("A1"),
    );
    expect(secondAttack.outcome).toBe("applied");

    const attackThenMove = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "B1", 4),
      ],
    });
    const firstAttack = applyAttack(
      attackThenMove,
      "green-1",
      squareFromName("H9"),
    );
    expect(firstAttack.outcome).toBe("applied");
    if (firstAttack.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(firstAttack.state.sideToMove).toBe("red");
    const secondMove = applyMove(
      firstAttack.state,
      "red-2",
      squareFromName("B2"),
    );
    expect(secondMove.outcome).toBe("applied");
  });

  it("refuses both a move and an attack for a ship that has already acted this ply", () => {
    // Built directly rather than played into (rules.md §5).
    const state = buildState({
      ships: [
        ship("green-1", "green", "H9", 1),
        ship("red-1", "red", "H10", 3),
      ],
      actedThisPly: ["green-1"],
    });

    const move = applyMove(state, "green-1", squareFromName("G9"));
    expect(move).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    const attack = applyAttack(state, "green-1", squareFromName("H10"));
    expect(attack).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("sends both ships to bays when the target stands on a dormant site, with nothing constraining either side's next turn (§8.5)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E5", 4), ship("red-1", "red", "F5", 2)],
      siteStates: { E5: "dormant" },
      sideToMove: "red",
      actionsRemaining: 1,
    });

    const result = applyAttack(state, "red-1", squareFromName("E5"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.sideToMove).toBe("green");
    const attacker = result.state.ships.find((s) => s.id === "red-1");
    const target = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker && isBay(attacker.square)).toBe(true);
    expect(attacker?.power).toBe(4);
    expect(target && isBay(target.square)).toBe(true);
    expect(target?.power).toBe(4);
  });

  it("marks the attacker as having acted, even though it ends the action in a bay itself", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 2), ship("red-1", "red", "K6", 2)],
    });

    const result = applyAttack(state, "green-1", squareFromName("K6"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const returnedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(isBay(returnedShip!.square)).toBe(true);
    // Its one action is spent even though it ends inside a bay itself, so
    // the ply ends here rather than waiting for a further action.
    expect(result.effects).toContainEqual({
      type: "ply-ended",
      side: "green",
      sideToMove: "red",
      endOfTurn: [],
    });

    // Built directly rather than played into (rules.md §5): this stands
    // for the moment right after the fight above, before the tail clears
    // actedThisPly for the next ply — a further attempt by the same ship
    // is still refused.
    const alreadyActed = buildState({
      ships: [ship("green-1", "green", "H15", 4)],
      actedThisPly: ["green-1"],
    });
    const secondAttempt = applyMove(
      alreadyActed,
      "green-1",
      squareFromName("H12"),
    );
    expect(secondAttempt).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an illegal attack, leaving the state exactly as it went in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "A1")],
    });
    const before = structuredClone(state);

    const result = applyAttack(state, "green-1", squareFromName("A1"));

    expect(result).toEqual({
      outcome: "refused",
      reason: "target-out-of-range",
    });
    expect(state).toEqual(before);
  });
});

describe("nothing a ship does changes any site's state (rules.md §8.2)", () => {
  it("leaves every site's state as it was across a sequence of moves and a fight", () => {
    // I8 is not one of the seventeen sites (rules.md §3.2), so it is
    // immune to every piece of end-of-turn site mechanics and is checked
    // for exact equality throughout. K5 is a real charged site: a real
    // site's drain rises every end-of-turn sequence regardless of what a
    // ship does (§8.3), so what this test can hold onto across the
    // sequence is that its *state* never changes — not that its drain is
    // literally unchanged. H8 is a real dormant site — the fight's target
    // cannot itself be charged (rules.md §7: a ship holding a charged node
    // cannot be attacked) — started with enough recovery left (§8.2) that
    // three end-of-turn sequences cannot bring it back to active.
    const state = buildState({
      ships: [
        ship("green-1", "green", "G8", 0),
        ship("green-2", "green", "A5", 4),
        ship("red-1", "red", "H8", 4),
        ship("red-2", "red", "O5", 4),
      ],
      siteStates: {
        H8: ["dormant", 50],
        I8: ["dormant", 0],
        K5: ["charged", 0],
      },
    });

    function expectSitesUnaffected(afterState: GameState): void {
      expect(afterState.siteStates.I8).toEqual({ state: "dormant", level: 0 });
      expect(afterState.siteStates.H8.state).toBe("dormant");
      expect(afterState.siteStates.K5.state).toBe("charged");
    }

    // Green's whole ply: an ordinary move touching no site.
    const afterGreenMove = applyMove(state, "green-2", squareFromName("B5"));
    expect(afterGreenMove.outcome).toBe("applied");
    if (afterGreenMove.outcome !== "applied") {
      throw new Error("expected green's move to be applied");
    }
    expectSitesUnaffected(afterGreenMove.state);

    // Red's whole ply: another ordinary move, so play returns to green.
    const afterRedMove = applyMove(
      afterGreenMove.state,
      "red-2",
      squareFromName("N5"),
    );
    expect(afterRedMove.outcome).toBe("applied");
    if (afterRedMove.outcome !== "applied") {
      throw new Error("expected red's move to be applied");
    }
    expectSitesUnaffected(afterRedMove.state);

    // Green's next ply: a fight at the dormant site, sending both ships home.
    const afterAttack = applyAttack(
      afterRedMove.state,
      "green-1",
      squareFromName("H8"),
    );
    expect(afterAttack.outcome).toBe("applied");
    if (afterAttack.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = afterAttack.state.ships.find((s) => s.id === "green-1");
    expect(isBay(attacker!.square)).toBe(true);
    expectSitesUnaffected(afterAttack.state);
  });
});

describe("assertFightInvariants (rules.md §7)", () => {
  it("throws when an uninvolved ship's square changed", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1", 2),
        ship("red-1", "red", "H9", 3),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-2" ? { ...s, square: squareFromName("B2") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship did not end on a bay square", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H10") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when two returned ships end in the same bay", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-1" || s.id === "red-1"
          ? { ...s, square: squareFromName("H15") }
          : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["green-1", "red-1"])),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship lands in a bay that held a ship before the fight", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "H9", 3),
        ship("red-2", "red", "H15", 4),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H15") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"])),
    ).toThrow(RangeError);
  });

  it("still throws when a site's state changes at all — no action changes a site's state (rules.md §8.6)", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
      siteStates: { H8: ["charged", 10] },
    });
    const after: GameState = {
      ...before,
      siteStates: { ...before.siteStates, H8: { state: "dormant", level: 10 } },
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"])),
    ).toThrow(RangeError);
  });
});

describe("applyPassGuard", () => {
  it("does not pass the ply when the side to move has no legal move but has a legal attack", () => {
    // green-1 on A1 (0 power, not a bay) is boxed in for movement — its
    // only two on-board orthogonal squares, A2 and B1, are both occupied —
    // but B1 is a legal attack target, so the side still has an action.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("passes the ply when its one ship with a nearby target has already acted", () => {
    // green-1 is boxed in for movement exactly as above, and red-1 stands
    // right next to it — a legal attack target, if green-1 had not already
    // spent its one action this ply. If `sideToMoveHasLegalAction` did not
    // consult the already-acted check, it would still see this as a legal
    // attack and the guard would never pass.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 0),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [],
    });
  });

  it("passes the ply when the side to move has no legal action at all", () => {
    // green-1 is in the A2 bay, so §3.1 forbids it to attack regardless of
    // what stands next to it, and every square it could otherwise reach —
    // A1, A3 and B2, its only on-board orthogonal neighbours — is occupied.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A2", 0),
        ship("red-1", "red", "A1"),
        ship("red-2", "red", "A3"),
        ship("red-3", "red", "B2"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.actedThisPly).toEqual([]);
    expect(result.state.plyNumber).toBe(2);
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [],
    });
  });

  it("passes the ply, and runs the end-of-turn sequence in full, when the side's only ship holds a charged node and has no legal move (rules.md §5, §7)", () => {
    // Without the charged-node protection every one of green-1's eight
    // neighbours would be a legal attack (as in the plain "eight
    // neighbours" case in combat.test.ts); with it, the side has no legal
    // action, and standing on the node still costs it a point of power,
    // while its side still collects energy, at the end of the turn the
    // pass still runs.
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
      siteStates: { H8: "charged" },
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.power).toBe(0);
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "power-lost",
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          power: 0,
        },
        {
          type: "energy-collected",
          side: "green",
          amount: 1,
          newTotal: 1,
          squares: [squareFromName("H8")],
        },
      ],
    });
  });

  it("leaves a state with a legal move untouched", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("passes once, unconditionally, when no ship at all has a legal move", () => {
    const state = buildState({ ships: [] });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.plyNumber).toBe(2);
    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [],
    });
  });

  it("advances the ply number on every pass, keeping green on the odd plies and red on the even ones", () => {
    let state = buildState({ ships: [] });

    for (let expectedPly = 1; expectedPly <= 6; expectedPly++) {
      expect(state.plyNumber).toBe(expectedPly);
      expect(state.sideToMove).toBe(expectedPly % 2 === 1 ? "green" : "red");

      const result = applyPassGuard(state);
      expect(result.effect).toBeDefined();
      state = result.state;
    }
  });

  it("runs the end-of-turn sequence for the passing side, so a ship that has moved and has no attack left still loses a point of power", () => {
    // green-1 sits on K5, a charged site, having already spent this ply's
    // first action on a move: it has no move left (already acted) and no
    // enemy stands anywhere near it to attack, so it passes with its second
    // action still nominally available.
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 1)],
      siteStates: { K5: "charged" },
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const result = applyPassGuard(state);

    expect(result.effect).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "power-lost",
          shipId: "green-1",
          side: "green",
          square: squareFromName("K5"),
          power: 0,
        },
        {
          type: "energy-collected",
          side: "green",
          amount: 1,
          newTotal: 1,
          squares: [squareFromName("K5")],
        },
      ],
    });
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.power).toBe(0);
  });

  it("the trap: returns the state untouched once the game is over, rather than passing an unbounded number of times", () => {
    // No ship at all has a legal action, which is exactly the condition the
    // guard would otherwise read as "pass". At ply 61 of a default-length
    // game the game is already over, so this must not run the end-of-turn
    // sequence, tick a clock, collect energy or advance the ply.
    const state = buildState({ ships: [], plyNumber: 61 });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("the trap, at a shorter length: returns the state untouched once that game's own length has run out", () => {
    const state = buildState({
      ships: [],
      plyNumber: 7,
      lengthInRounds: 3,
    });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("a state one action from the end, driven through that action, ends at ply 61 with the guard having fired nothing", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H8")],
      sideToMove: "red",
      actionsRemaining: 1,
      plyNumber: 60,
    });

    const result = applyMove(state, "red-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.plyNumber).toBe(61);
    expect(result.effects.some((effect) => effect.type === "ply-passed")).toBe(
      false,
    );

    const guarded = applyPassGuard(result.state);
    expect(guarded.state).toEqual(result.state);
    expect(guarded.effect).toBeUndefined();
  });
});

describe("a ship leaving a node no longer ends it (rules.md §8.3)", () => {
  it("leaves a charged node charged when a ship moves off it, its drain risen only by that turn's empty-rate draw", () => {
    // red-1 gives red a legal move, so applyPassGuard does not immediately
    // run a second end-of-turn sequence for a passed red ply — this checks
    // exactly the state green's own move produces, nothing beyond it.
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      siteStates: { H8: ["charged", 23] },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.effects.some((effect) => effect.type === "ply-passed")).toBe(
      false,
    );
    // H8 was charged when this ply began and stays charged — leaving it no
    // longer ends it. Since green-1 has left, its drain comes from the
    // empty table (rules.md §8.3), not the held one, and no announcement is
    // made about it.
    const [emptyDrawAmount] = drawTableAmount(
      state.randomSeed,
      EMPTY_NODE_DRAIN_TABLE,
    );
    expect(result.state.siteStates.H8).toEqual({
      state: "charged",
      level: 23 + emptyDrawAmount,
    });
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-vacated" }),
    );
  });

  it("leaves a node charged when a ship simply arrives on it — arriving is not a departure", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7")],
      siteStates: { H8: ["charged", 5] },
    });

    const result = applyMove(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.H8.state).toBe("charged");
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-vacated" }),
    );
  });

  it("collects no energy and loses no power for a node the moving player stepped off this turn", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3)],
      siteStates: { H8: ["charged", 5] },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const plyEnded = result.effects.find(
      (effect) => effect.type === "ply-ended",
    );
    expect(plyEnded).toBeDefined();
    if (plyEnded?.type !== "ply-ended") {
      throw new Error("expected a ply-ended effect");
    }
    expect(plyEnded.endOfTurn).not.toContainEqual(
      expect.objectContaining({ type: "energy-collected" }),
    );
    expect(plyEnded.endOfTurn).not.toContainEqual(
      expect.objectContaining({ type: "power-lost" }),
    );
  });
});
