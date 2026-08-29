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
  type AdvancingWinner,
  applyAttack,
  applyMove,
  applyPassGuard,
  assertFightInvariants,
} from "./ply";
import { drawIndex } from "./random";
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

/** A ship parked on every bay except `emptyBayName`, so a return draw's pool is exactly one square. */
function shipsFillingEveryBayExcept(emptyBayName: string): Ship[] {
  return BAYS.filter((square) => squareName(square) !== emptyBayName).map(
    (square, index) => ship(`bay-filler-${index}`, "red", squareName(square)),
  );
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

  it("resets shields to 0 when a move ends in a bay, but not when it only passes over one", () => {
    const endsInBay = buildState({
      ships: [ship("green-1", "green", "A11", 2)],
    });
    const endResult = applyMove(endsInBay, "green-1", squareFromName("A10"));
    expect(endResult.outcome).toBe("applied");
    if (endResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const landedShip = endResult.state.ships.find((s) => s.id === "green-1");
    expect(landedShip?.shields).toBe(0);
    expect(endResult.effects).toContainEqual({
      type: "shields-reset",
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
    expect(flownShip?.shields).toBe(2);
    expect(passResult.effects).not.toContainEqual(
      expect.objectContaining({ type: "shields-reset" }),
    );
  });

  it("does not report a shields-reset effect for a ship that had no shields to lose", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "A11", 0)],
    });
    const result = applyMove(state, "green-1", squareFromName("A10"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const landedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(landedShip?.shields).toBe(0);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "shields-reset" }),
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
  it("resolves an attacker's win: the attacker advances onto the loser's square and keeps the fight's shields, the defender returns to a bay at 0", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 1)],
    });
    const before = structuredClone(state);

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner).toEqual(ship("green-1", "green", "H9", 1));
    // Pinned to the exact bay `randomSeed: 1`'s draw produces, so a change to
    // the draw itself shows up as a failing expectation rather than
    // silently; other fights below assert only that the returning ship lands
    // in a bay.
    const loser = result.state.ships.find((s) => s.id === "red-1");
    expect(loser).toEqual(ship("red-1", "red", "H1", 0));

    // The attack is the ply's one action, so it ends the ply too; the
    // freshly beaten red-1 still has a legal move, so the pass guard does
    // not also fire and add its own effect.
    expect(result.effects).toEqual([
      {
        type: "fight-resolved",
        outcome: "attacker-won",
        attacker: {
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          shields: 3,
        },
        defender: {
          shipId: "red-1",
          side: "red",
          square: squareFromName("H9"),
          shields: 1,
        },
        winner: {
          shipId: "green-1",
          remainingShields: 1,
          square: squareFromName("H9"),
          advanced: true,
        },
        returns: [
          {
            shipId: "red-1",
            side: "red",
            from: squareFromName("H9"),
            to: squareFromName("H1"),
          },
        ],
      },
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);

    // The input state itself is never mutated.
    expect(state).toEqual(before);
  });

  it("resolves a defender's win: the attacker returns to a bay at 0, the defender stays put and keeps the fight's shields", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "H9", 3)],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker?.shields).toBe(0);
    expect(isBay(attacker!.square)).toBe(true);
    const defender = result.state.ships.find((s) => s.id === "red-1");
    expect(defender).toEqual(ship("red-1", "red", "H9", 1));

    // The attack is the ply's one action, so it ends the ply too; red still
    // has a legal move, so the pass guard does not also fire.
    expect(result.effects).toEqual([
      {
        type: "fight-resolved",
        outcome: "defender-won",
        attacker: {
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          shields: 1,
        },
        defender: {
          shipId: "red-1",
          side: "red",
          square: squareFromName("H9"),
          shields: 3,
        },
        winner: {
          shipId: "red-1",
          remainingShields: 1,
          square: squareFromName("H9"),
          advanced: false,
        },
        returns: [
          {
            shipId: "green-1",
            side: "green",
            from: squareFromName("H8"),
            to: attacker!.square,
          },
        ],
      },
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("resolves a mutual return on equal shields: both ships return to bays at 0, the attacker placed first", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker?.shields).toBe(0);
    expect(isBay(attacker!.square)).toBe(true);
    const defender = result.state.ships.find((s) => s.id === "red-1");
    expect(defender?.shields).toBe(0);
    expect(isBay(defender!.square)).toBe(true);
    // Two different bays: the defender's draw is made against the state
    // that already holds the attacker.
    expect(squareName(defender!.square)).not.toBe(squareName(attacker!.square));

    // The attack is the ply's one action, so it ends the ply too; both
    // ships still have a legal move from their bays, so the pass guard does
    // not also fire.
    expect(result.effects).toEqual([
      {
        type: "fight-resolved",
        outcome: "mutual-return",
        attacker: {
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          shields: 2,
        },
        defender: {
          shipId: "red-1",
          side: "red",
          square: squareFromName("H9"),
          shields: 2,
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
      },
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("draws the attacker's bay first on a mutual return, pinned to a stated seed", () => {
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

  it("costs exactly one shield to beat a 0-shield ship", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 0)],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.shields).toBe(2);
  });

  it("lets a winner reduced to 0 shields advance onto a charged node and gain one back at the end of the ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "K6", 1), ship("red-1", "red", "K5", 0)],
      siteStates: { K5: "charged" },
      actionsRemaining: 1,
    });

    const result = applyAttack(state, "green-1", squareFromName("K5"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("K5"));
    expect(winner?.shields).toBe(1);
    expect(result.effects).toContainEqual({
      type: "ply-ended",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "shield-gained",
          shipId: "green-1",
          side: "green",
          square: squareFromName("K5"),
          shields: 1,
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
  });

  it("advances the winner onto the loser's square, leaving that square empty of anyone but the winner and the attacker's own square empty", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 1)],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const occupiedSquares = result.state.ships.map((s) => squareName(s.square));
    expect(occupiedSquares).not.toContain(squareName(squareFromName("H8")));
    expect(occupiedSquares).toContain(squareName(squareFromName("H9")));
  });

  it("leaves an already-charged node the winner advances onto charged, with its clock unchanged, and touches no other site", () => {
    // G4/G5: column G carries no site at any row (rules.md §3.2), so G5 is
    // immune to the drain and recovery every end-of-turn sequence now runs
    // (§8.2, §8.3) — this stays a pure test of the fight and advance
    // themselves.
    const state = buildState({
      ships: [ship("green-1", "green", "G4", 3), ship("red-1", "red", "G5", 1)],
      siteStates: { G5: ["charged", 3] },
    });

    const result = applyAttack(state, "green-1", squareFromName("G5"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("G5"));
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
  });

  it("keeps the fleet the same size on each side, across a sequence of fights", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "A1", 1),
        ship("green-3", "green", "A3"),
        ship("green-4", "green", "A5"),
        ship("green-5", "green", "A7"),
        ship("green-6", "green", "A9"),
        ship("green-7", "green", "A11"),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "B1", 1),
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

  it("puts the loser in the one empty bay, whatever the seed", () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const state: GameState = {
        ...buildState({
          ships: [
            ship("green-1", "green", "H8", 3),
            ship("red-1", "red", "H9", 0),
            ...shipsFillingEveryBayExcept("H15"),
          ],
        }),
        randomSeed: seed,
      };
      const result = applyAttack(state, "green-1", squareFromName("H9"));
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      expect(
        squareName(result.state.ships.find((s) => s.id === "red-1")!.square),
      ).toBe("H15");
    }
  });

  it("recomputes the return bay live: a bay an earlier ply's move vacated is where a fight's beaten ship lands, once it is the only bay empty", () => {
    // green-2 sits in H15, the last bay left empty once green-2 moves out of
    // it; green-1 and red-1 are positioned for the fight the next ply
    // brings.
    const state = buildState({
      ships: [
        ship("green-2", "green", "H15", 4),
        ship("green-1", "green", "H9", 0),
        ship("red-1", "red", "H8", 3),
        ...shipsFillingEveryBayExcept("H15"),
      ],
    });

    const vacated = applyMove(state, "green-2", squareFromName("H14"));
    expect(vacated.outcome).toBe("applied");
    if (vacated.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(vacated.state.sideToMove).toBe("red");

    // H15 is now the only empty bay, so the fight's loser must land there,
    // whichever seed drew it.
    const result = applyAttack(vacated.state, "red-1", squareFromName("H9"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(
      squareName(result.state.ships.find((s) => s.id === "green-1")!.square),
    ).toBe("H15");
  });

  it("advances randomSeed once on a single-loser fight and twice on a mutual return", () => {
    // Drawing the second return of a mutual return from the same seed the
    // first draw used would silently break replay: the pool is just one
    // square shorter, so the draw still looks legal.
    const singleLoser = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 0)],
    });
    const singleLoserResult = applyAttack(
      singleLoser,
      "green-1",
      squareFromName("H9"),
    );
    if (singleLoserResult.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(singleLoserResult.state.randomSeed).not.toBe(singleLoser.randomSeed);

    const mutual = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
    });
    const mutualResult = applyAttack(mutual, "green-1", squareFromName("H9"));
    if (mutualResult.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    // Both bays start empty, so the attacker's draw picks from all fourteen
    // and the defender's draw — against the state that already holds the
    // attacker — picks from the remaining thirteen.
    const [, seedAfterAttackerDraw] = drawIndex(mutual.randomSeed, BAYS.length);
    const [, seedAfterDefenderDraw] = drawIndex(
      seedAfterAttackerDraw,
      BAYS.length - 1,
    );
    expect(mutualResult.state.randomSeed).toBe(seedAfterDefenderDraw);
  });

  it("places both ships in different bays on a mutual return, whatever the seed, when exactly two bays are empty", () => {
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

  it("never lands a mutual return's two ships on the same bay, swept over many chained seeds with several bays empty", () => {
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
    // This stands for the moment right after green-1 won a fight at H9.
    const state = buildState({
      ships: [ship("green-1", "green", "H9", 2), ship("red-2", "red", "G9", 0)],
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
      ships: [ship("green-1", "green", "H9", 1)],
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
      ships: [ship("green-1", "green", "H9", 0), ship("red-1", "red", "H10")],
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
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1", 0),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "B1", 0),
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
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1", 0),
        ship("red-1", "red", "B1", 0),
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
        ship("green-1", "green", "H8", 3),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "B1", 0),
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
        ship("green-1", "green", "H9", 3),
        ship("red-1", "red", "H10", 1),
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

  it("beats a ship standing on a dormant site into a bay, with nothing constraining its owner's next turn (§8.5)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E5", 0), ship("red-1", "red", "F5", 2)],
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
    const beatenShip = result.state.ships.find((s) => s.id === "green-1");
    expect(beatenShip).toBeDefined();
    expect(beatenShip && isBay(beatenShip.square)).toBe(true);
    expect(beatenShip?.shields).toBe(0);
  });

  it("marks the attacker as having acted on a mutual return, even though it ends the action in a bay itself", () => {
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
    // for the moment right after the mutual return above, before the tail
    // clears actedThisPly for the next ply — a further attempt by the same
    // ship is still refused.
    const alreadyActed = buildState({
      ships: [ship("green-1", "green", "H15", 0)],
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
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "A1")],
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

describe("the winner's advance (rules.md §7)", () => {
  // A 0-shield attacker unlocks the three-square orthogonal reach, but 0
  // shields can never win a fight (§7: the stronger side wins, and 0 against
  // 0 is a mutual return), so the three-square advance can never be produced
  // through `applyAttack`. It is tested directly against `winnerAdvance` in
  // `combat.test.ts` instead.
  it.each([
    {
      label: "one square orthogonally",
      attackerSquare: "H8",
      attackerShields: 4 as ShieldCount,
      defenderSquare: "H9",
      passedOverNames: [] as string[],
      winnerShields: 3 as ShieldCount,
    },
    {
      label: "one square diagonally",
      attackerSquare: "H8",
      attackerShields: 3 as ShieldCount,
      defenderSquare: "I9",
      passedOverNames: [] as string[],
      winnerShields: 2 as ShieldCount,
    },
    {
      label: "two squares orthogonally",
      attackerSquare: "H5",
      attackerShields: 2 as ShieldCount,
      defenderSquare: "H7",
      passedOverNames: ["H6"],
      winnerShields: 1 as ShieldCount,
    },
    {
      label: "two squares diagonally",
      attackerSquare: "H5",
      attackerShields: 1 as ShieldCount,
      defenderSquare: "J7",
      passedOverNames: ["I6"],
      winnerShields: 0 as ShieldCount,
    },
  ])(
    "advances the winner onto the loser's square for an attack from $label, leaving the squares between it empty",
    ({
      attackerSquare,
      attackerShields,
      defenderSquare,
      passedOverNames,
      winnerShields,
    }) => {
      const state = buildState({
        ships: [
          ship("green-1", "green", attackerSquare, attackerShields),
          ship("red-1", "red", defenderSquare, 0),
        ],
      });

      const result = applyAttack(
        state,
        "green-1",
        squareFromName(defenderSquare),
      );

      expect(result.outcome).toBe("applied");
      if (result.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      const winner = result.state.ships.find((s) => s.id === "green-1");
      expect(winner?.square).toEqual(squareFromName(defenderSquare));
      expect(winner?.shields).toBe(winnerShields);

      const occupiedNames = result.state.ships.map((s) => squareName(s.square));
      expect(occupiedNames).not.toContain(attackerSquare);
      for (const passedOverName of passedOverNames) {
        expect(occupiedNames).not.toContain(passedOverName);
      }
    },
  );

  it("advances onto the loser's square when it is a dormant site", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 2), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: "dormant" },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H8"));
    expect(winner?.shields).toBe(1);
    const loser = result.state.ships.find((s) => s.id === "red-1");
    expect(loser && isBay(loser.square)).toBe(true);
  });

  it("advances onto the loser's square when it is an active site", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 3), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: ["active", 1] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H8"));

    const fightResolved = result.effects[0];
    if (fightResolved.type !== "fight-resolved") {
      throw new Error("expected a fight-resolved effect first");
    }
    expect(fightResolved.winner).toEqual({
      shipId: "green-1",
      remainingShields: 2,
      square: squareFromName("H8"),
      advanced: true,
    });
  });

  it("landing on a charged site during a winning advance leaves it charged", () => {
    // A winner's advance is limited by occupancy alone (rules.md §7); site
    // state never skips a candidate. G7/G8: column G carries no site at
    // any row, so G8 is the only site in play.
    const state = buildState({
      ships: [ship("green-1", "green", "G7", 4), ship("red-1", "red", "G8", 0)],
      siteStates: { G8: ["charged", 1] },
    });

    const result = applyAttack(state, "green-1", squareFromName("G8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("G8"));
    expect(result.state.siteStates.G8).toEqual(state.siteStates.G8);
  });

  it("flying over an active site during a winning advance leaves it active", () => {
    // Five sites elsewhere are already charged, so the end-of-turn charge
    // draw this fight's ply-end triggers has no shortfall to fill and
    // cannot touch H8 — the only thing that could change H8's state is the
    // advance flying over it. Its level does still move: every active site
    // gains a point of pressure at the end of every turn (§8.2, §8.6 step
    // 5), whether or not the fight went near it.
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 2), ship("red-1", "red", "H9", 0)],
      siteStates: {
        H8: ["active", 1],
        F2: "charged",
        J2: "charged",
        B4: "charged",
        N4: "charged",
        D8: "charged",
      },
      plyNumber: 6,
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H9"));
    expect(result.state.siteStates.H8).toEqual({ state: "active", level: 2 });
  });

  it("changes no site on a defender's win, even with active sites on the lane and on the bay the loser is placed in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 1), ship("red-1", "red", "H8", 3)],
      siteStates: { H6: "charged", H7: "active", H15: "active" },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.effects[0]).toMatchObject({ outcome: "defender-won" });
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
  });

  it("changes no site on a mutual return, even with an active site on the defender's own square, on the lane, and on both bays the ships are placed in", () => {
    // Five sites elsewhere are already charged, so the end-of-turn charge
    // draw the fight's own ply-end triggers has no shortfall to fill and
    // cannot touch H8 either — the only source of any site-state change
    // under test here is the fight itself.
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 2), ship("red-1", "red", "H8", 2)],
      siteStates: {
        H6: "charged",
        H7: "active",
        H8: "active",
        H15: "active",
        L15: "active",
        F2: "charged",
        J2: "charged",
        B4: "charged",
        N4: "charged",
        D8: "charged",
      },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.effects[0]).toMatchObject({ outcome: "mutual-return" });
    // H6, H7, H15 and L15 are not among the seventeen sites (rules.md
    // §3.2), so they are immune to every piece of end-of-turn site
    // mechanics and stay exactly as they went in. H8 is a real site, and
    // it is active: the fight itself does not touch it — untouched by
    // drain or recovery, and the charge draw has no shortfall to fill —
    // but it does gain a point of pressure like any other active site at
    // the end of the turn (§8.2, §8.6 step 5). F2, J2, B4, N4 and D8 are
    // real charged sites with no ship on them: their drain does rise
    // (§8.3), so what stays true of them is that they remain charged, not
    // that their drain is literally unchanged.
    for (const name of ["H6", "H7", "H15", "L15"]) {
      expect(result.state.siteStates[name]).toEqual(state.siteStates[name]);
    }
    expect(result.state.siteStates.H8).toEqual({ state: "active", level: 1 });
    for (const name of ["F2", "J2", "B4", "N4", "D8"]) {
      expect(result.state.siteStates[name].state).toBe("charged");
      expect(result.state.siteStates[name].level).toBeGreaterThan(0);
    }
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
  });

  it("holds its ground rather than crossing the bay the loser was just drawn into (D15 reproduction)", () => {
    // The lane's one intermediate square, H15, is a bay; with H15 and L15
    // the only empty bays, seed 7 draws the loser into H15, right on the
    // lane the attacker is advancing down.
    const emptyBayNames = ["H15", "L15"];
    const bayOccupants = BAYS.filter(
      (square) => !emptyBayNames.includes(squareName(square)),
    ).map((square, index) =>
      ship(`bay-filler-${index}`, "red", squareName(square)),
    );
    const state: GameState = {
      ...buildState({
        ships: [
          ship("green-1", "green", "G15", 1),
          ship("red-1", "red", "I15", 0),
          ...bayOccupants,
        ],
      }),
      randomSeed: 7,
    };

    const result = applyAttack(state, "green-1", squareFromName("I15"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const loser = result.state.ships.find((s) => s.id === "red-1")!;
    expect(squareName(loser.square)).toBe("H15");

    const winner = result.state.ships.find((s) => s.id === "green-1")!;
    expect(squareName(winner.square)).toBe("G15");
    expect(result.effects[0]).toMatchObject({
      winner: {
        shipId: "green-1",
        square: squareFromName("G15"),
        advanced: false,
      },
    });
  });
});

describe("nothing a ship does changes any site's state (rules.md §8.2)", () => {
  it("leaves every site's state as it was across a sequence of moves and a won fight whose winner advances onto a site", () => {
    // I8 is not one of the seventeen sites (rules.md §3.2), so it is
    // immune to every piece of end-of-turn site mechanics and is checked
    // for exact equality throughout. H8 and K5 are real charged sites: a
    // real site's drain rises every end-of-turn sequence regardless of
    // what a ship does (§8.3), so what this test can hold onto across the
    // sequence is that neither one's *state* ever changes — not that its
    // drain is literally unchanged.
    const state = buildState({
      ships: [
        ship("green-1", "green", "G8", 4),
        ship("green-2", "green", "A5", 0),
        ship("red-1", "red", "H8", 0),
        ship("red-2", "red", "O5", 0),
      ],
      siteStates: {
        H8: ["charged", 1],
        I8: ["dormant", 0],
        K5: ["charged", 0],
      },
    });

    function expectSitesUnaffected(afterState: GameState): void {
      expect(afterState.siteStates.I8).toEqual({ state: "dormant", level: 0 });
      expect(afterState.siteStates.H8.state).toBe("charged");
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

    // Green's next ply: a won fight whose winner advances onto a charged site.
    const afterAttack = applyAttack(
      afterRedMove.state,
      "green-1",
      squareFromName("H8"),
    );
    expect(afterAttack.outcome).toBe("applied");
    if (afterAttack.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = afterAttack.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H8"));
    expectSitesUnaffected(afterAttack.state);
  });
});

describe("assertFightInvariants (rules.md §7)", () => {
  it("throws when an uninvolved ship's square changed", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1", 2),
        ship("red-1", "red", "H9", 1),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-2" ? { ...s, square: squareFromName("B2") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), undefined),
    ).toThrow(RangeError);
  });

  it("throws when the winning attacker's reported square is off the attack's lane, even though it matches the advance's own reported path", () => {
    // The advance's own travelled set (`travelledSquareNames`) claims A1,
    // matching the winner's actual square below — a set built from the
    // advance's own output could never catch this. The check must instead
    // use the attack's lane (`laneSquareNames`), which is independent of
    // what the advance reported and does not contain A1.
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 1)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-1" ? { ...s, square: squareFromName("A1") } : s,
      ),
    };
    const advancingWinner: AdvancingWinner = {
      shipId: "green-1",
      laneSquareNames: new Set(["H8", "H9"]),
      travelledSquareNames: new Set(["A1"]),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), advancingWinner),
    ).toThrow(RangeError);
  });

  it("throws when the winning attacker's advance crosses a square another ship occupies in `after` (D15)", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H5", 3),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "H7", 0),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "green-1" ? { ...s, square: squareFromName("H7") } : s,
      ),
    };
    const advancingWinner: AdvancingWinner = {
      shipId: "green-1",
      laneSquareNames: new Set(["H6", "H7", "H8", "H9"]),
      travelledSquareNames: new Set(["H7"]),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), advancingWinner),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship did not end on a bay square", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 1)],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H10") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), undefined),
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
      assertFightInvariants(
        before,
        after,
        new Set(["green-1", "red-1"]),
        undefined,
      ),
    ).toThrow(RangeError);
  });

  it("throws when a returned ship lands in a bay that held a ship before the fight", () => {
    const before = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "H15", 0),
      ],
    });
    const after: GameState = {
      ...before,
      ships: before.ships.map((s) =>
        s.id === "red-1" ? { ...s, square: squareFromName("H15") } : s,
      ),
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), undefined),
    ).toThrow(RangeError);
  });

  it("still throws when a site's state changes during the fight itself — the vacating rule (§8.7) is applied separately, afterwards, and is not what this check is about", () => {
    const before = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 1)],
      siteStates: { H8: ["charged", 10] },
    });
    const after: GameState = {
      ...before,
      siteStates: { ...before.siteStates, H8: { state: "dormant", level: 10 } },
    };

    expect(() =>
      assertFightInvariants(before, after, new Set(["red-1"]), undefined),
    ).toThrow(RangeError);
  });
});

describe("applyPassGuard", () => {
  it("does not pass the ply when the side to move has no legal move but has a legal attack", () => {
    // green-1 on A1 (4 shields, not a bay) is boxed in for movement — its
    // only two on-board orthogonal squares, A2 and B1, are both occupied —
    // but B1 is a legal attack target, so the side still has an action.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 4),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.state).toEqual(state);
    expect(result.effect).toBeUndefined();
  });

  it("passes the ply when its one ship with a nearby target has already acted — the already-acted check must live in the seven-only layer", () => {
    // green-1 is boxed in for movement exactly as above, and red-1 stands
    // right next to it — a legal attack target, if green-1 had not already
    // spent its one action this ply. If the already-acted check lived only
    // in the public `attackRefusalReason` and not in
    // `sevenOnlyAttackRefusalReason`, `sideToMoveHasLegalAction` would still
    // see this as a legal attack and the guard would never pass.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 4),
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
        ship("green-1", "green", "A2", 4),
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

  it("runs the end-of-turn sequence for the passing side, so a ship that has moved and has no attack left still gains a shield", () => {
    // green-1 sits on K5, a charged site, having already spent this ply's
    // first action on a move: it has no move left (already acted) and no
    // enemy stands anywhere near it to attack, so it passes with its second
    // action still nominally available.
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 3)],
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
          type: "shield-gained",
          shipId: "green-1",
          side: "green",
          square: squareFromName("K5"),
          shields: 4,
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
    expect(passedShip?.shields).toBe(4);
  });

  it("the trap: returns the state untouched once the game is over, rather than passing an unbounded number of times", () => {
    // No ship at all has a legal action, which is exactly the condition the
    // guard would otherwise read as "pass". At ply 201 of a hundred-round
    // game the game is already over, so this must not run the end-of-turn
    // sequence, tick a clock, collect energy or advance the ply.
    const state = buildState({ ships: [], plyNumber: 201 });

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

  it("a state one action from the end, driven through that action, ends at ply 201 with the guard having fired nothing", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H8")],
      sideToMove: "red",
      actionsRemaining: 1,
      plyNumber: 200,
    });

    const result = applyMove(state, "red-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.plyNumber).toBe(201);
    expect(result.effects.some((effect) => effect.type === "ply-passed")).toBe(
      false,
    );

    const guarded = applyPassGuard(result.state);
    expect(guarded.state).toEqual(result.state);
    expect(guarded.effect).toBeUndefined();
  });
});

describe("§8.7 — leaving a node ends it", () => {
  it("sends a charged node dormant immediately when a ship moves off it, before the opponent's turn, carrying the drain it had", () => {
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
    // H8 was charged, not dormant, when this ply began, so step 6's
    // "dormant before this ply began" filter (§8.6) excludes it: it does
    // not recover this same sequence, and its drain is exactly what it was.
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      level: 23,
    });
    expect(result.effects).toContainEqual({
      type: "node-vacated",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
    });
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

  it("leaves a node charged when a beaten defender is replaced by the advancing attacker — the case the rule is shaped around, a node changes hands intact", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 3), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: ["charged", 41] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H8"));
    // The node is never unoccupied — red-1 stood there, then green-1 does —
    // so it stays charged. Its drain still rises this ply (§8.3, held table,
    // since the winner now stands on it), which is a different mechanic;
    // what matters here is that it never went dormant.
    expect(result.state.siteStates.H8.state).toBe("charged");
    expect(result.state.siteStates.H8.level).toBeGreaterThan(41);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "node-vacated" }),
    );
  });

  it("sends a node dormant, at the drain it had, when a drawn fight over it returns both ships to bays", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 2), ship("red-1", "red", "H8", 2)],
      siteStates: { H8: ["charged", 15] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      level: 15,
    });
    expect(result.effects).toContainEqual({
      type: "node-vacated",
      square: squareFromName("H8"),
      shipId: "red-1",
      side: "red",
    });
  });

  // A blocked advance — §7's case where the beaten ship's own return bay
  // lands on the lane the winner would otherwise advance down — cannot be
  // reproduced through `applyAttack` against a real site on this board: every
  // one of the seventeen sites sits far enough from every bay that no reach
  // entry landing on a site ever has a bay square anywhere on its lane
  // (verified by an exhaustive sweep of every origin, shield count and
  // reach entry during this step's implementation). `vacating.test.ts`
  // covers this case directly, against a hand-built before/after pair, the
  // same way `assertFightInvariants`' own tests reach otherwise-impossible
  // states.

  it("sends the origin node dormant when its occupant wins a fight and advances off it", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 0)],
      siteStates: { H8: ["charged", 27] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H9"));
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      level: 27,
    });
    expect(result.effects).toContainEqual({
      type: "node-vacated",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
    });
  });

  it("sends a losing attacker's own node dormant when it is pushed back to a bay", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 3)],
      siteStates: { H8: ["charged", 9] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const loser = result.state.ships.find((s) => s.id === "green-1");
    expect(loser && isBay(loser.square)).toBe(true);
    expect(result.state.siteStates.H8).toEqual({
      state: "dormant",
      level: 9,
    });
    expect(result.effects).toContainEqual({
      type: "node-vacated",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
    });
  });

  it("sends two nodes dormant at once, in SITES order, when a drawn fight vacates both", () => {
    // F2 and H4 are both real sites and are exactly a diagonal reach of 2
    // apart — one of the few pairs of sites close enough to attack one
    // another directly.
    const state = buildState({
      ships: [ship("green-1", "green", "F2", 1), ship("red-1", "red", "H4", 1)],
      siteStates: { F2: ["charged", 8], H4: ["charged", 14] },
    });

    const result = applyAttack(state, "green-1", squareFromName("H4"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.siteStates.F2).toEqual({ state: "dormant", level: 8 });
    expect(result.state.siteStates.H4).toEqual({
      state: "dormant",
      level: 14,
    });
    const vacatedEffects = result.effects.filter(
      (effect) => effect.type === "node-vacated",
    );
    expect(vacatedEffects).toEqual([
      {
        type: "node-vacated",
        square: squareFromName("F2"),
        shipId: "green-1",
        side: "green",
      },
      {
        type: "node-vacated",
        square: squareFromName("H4"),
        shipId: "red-1",
        side: "red",
      },
    ]);
  });

  it("collects no energy and gains no shield for a node the moving player stepped off this turn", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 1)],
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
      expect.objectContaining({ type: "shield-gained" }),
    );
  });
});
