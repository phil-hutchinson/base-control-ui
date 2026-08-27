import { describe, expect, it } from "vitest";
import { BAYS, STARTING_RETURN_POSITION_INDEX, isBay } from "./bays";
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
import { strandedShipIds } from "./stranded";

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
      const [state, enteredOnPly] = Array.isArray(entry) ? entry : [entry, 0];
      return [name, { state, enteredOnPly }];
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
  returnPositionIndex?: number;
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
    returnPositionIndex:
      config.returnPositionIndex ?? STARTING_RETURN_POSITION_INDEX,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("applyMove", () => {
  it("moves the ship and touches nothing else", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      siteStates: { E5: "active" },
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

  it("charges an active site a ship lands on, mid-move (rules.md §8.2)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { K8: "active" },
      plyNumber: 5,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.K8).toEqual({
      state: "charged",
      enteredOnPly: 5,
    });
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("K8"),
      shipId: "green-1",
      side: "green",
      reach: "landed-on",
    });
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("K8"));
  });

  it("charges an active site a ship flies over without stopping (rules.md §8.2)", () => {
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
    expect(result.state.siteStates.I8).toEqual({
      state: "charged",
      enteredOnPly: 3,
    });
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("I8"),
      shipId: "green-1",
      side: "green",
      reach: "flown-over",
    });
    const movedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(movedShip?.square).toEqual(squareFromName("K8"));
  });

  it("wakes a site for a red ship exactly as it would for a green one", () => {
    const state = buildState({
      ships: [ship("red-1", "red", "H8")],
      sideToMove: "red",
      siteStates: { K8: "active" },
      plyNumber: 6,
    });

    const result = applyMove(state, "red-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.K8).toEqual({
      state: "charged",
      enteredOnPly: 6,
    });
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("K8"),
      shipId: "red-1",
      side: "red",
      reach: "landed-on",
    });
  });

  it("leaves an already-charged site's clock untouched when touched again", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { K8: ["charged", 2] },
      plyNumber: 5,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.K8).toEqual({
      state: "charged",
      enteredOnPly: 2,
    });
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
  });

  it("leaves a dormant or depleted site flown over unaffected and reports no effect", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { I8: "dormant", J8: ["depleted", 1] },
      plyNumber: 4,
    });

    const result = applyMove(state, "green-1", squareFromName("K8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates.I8).toEqual(state.siteStates.I8);
    expect(result.state.siteStates.J8).toEqual(state.siteStates.J8);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
  });

  it("reports no site-charged effect and leaves siteStates deeply unchanged when a move touches no site", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      siteStates: { E5: "active" },
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
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

  it("drifts the return position once the ply's one action ends it", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O15")],
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const result = applyMove(state, "green-1", squareFromName("H9"));
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.returnPositionIndex).not.toBe(
      STARTING_RETURN_POSITION_INDEX,
    );
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
    const state = buildState({
      ships: [ship("green-1", "green", "K4", 3), ship("red-1", "red", "K5", 1)],
      siteStates: { K5: ["charged", 3] },
    });

    const result = applyAttack(state, "green-1", squareFromName("K5"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("K5"));
    // The end-of-turn sequence does run, but nothing depletes or cools this
    // ply and a site already charged is not re-charged by §8.2, so
    // siteStates comes back untouched — same reference, not merely equal
    // contents.
    expect(result.state.siteStates).toBe(state.siteStates);
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
    // first draw used would silently break replay (D5): the pool is just
    // one square shorter, so the draw still looks legal.
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
    // Two draws happened, so the seed must not be where one draw would
    // leave it.
    const [, seedAfterOneDraw] = drawIndex(mutual.randomSeed, BAYS.length);
    expect(mutualResult.state.randomSeed).not.toBe(mutual.randomSeed);
    expect(mutualResult.state.randomSeed).not.toBe(seedAfterOneDraw);
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

  it("drifts the return position once the ply's one attack ends it", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "K5", 4), ship("red-1", "red", "K6", 0)],
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const result = applyAttack(state, "green-1", squareFromName("K6"));
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.returnPositionIndex).not.toBe(
      STARTING_RETURN_POSITION_INDEX,
    );

    const attacker = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker?.square).toEqual(squareFromName("K6"));
    expect(attacker?.shields).toBe(3);
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

  it("un-strands by force: a ship stranded on a depleted site that is beaten in a fight is in a bay and owes nothing on its owner's next turn", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E5", 0), ship("red-1", "red", "F5", 2)],
      siteStates: { E5: "depleted" },
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
    expect(strandedShipIds(result.state)).not.toContain("green-1");
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

  it("stops the advance one square short when the loser's square is a depleted site, a reachable version of the stop-short rule", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 2), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: "depleted" },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H7"));
    expect(winner?.shields).toBe(1);
    const loser = result.state.ships.find((s) => s.id === "red-1");
    expect(loser && isBay(loser.square)).toBe(true);
  });

  it("holds its ground on an adjacent attack onto a dormant site", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 3), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: "dormant" },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H7"));

    const fightResolved = result.effects[0];
    if (fightResolved.type !== "fight-resolved") {
      throw new Error("expected a fight-resolved effect first");
    }
    expect(fightResolved.winner).toEqual({
      shipId: "green-1",
      remainingShields: 2,
      square: squareFromName("H7"),
      advanced: false,
    });
  });

  it("wakes an active site the advance lands on, starting its clock (reach: landed-on)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "G8", 4), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: "active" },
      plyNumber: 4,
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
      reach: "landed-on",
    });
    expect(result.state.siteStates.H8).toEqual({
      state: "charged",
      enteredOnPly: 4,
    });
  });

  it("wakes an active site the advance merely flies over, starting its clock (reach: flown-over)", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H7", 2), ship("red-1", "red", "H9", 0)],
      siteStates: { H8: "active" },
      plyNumber: 6,
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H9"));
    expect(result.effects).toContainEqual({
      type: "site-charged",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
      reach: "flown-over",
    });
    expect(result.state.siteStates.H8).toEqual({
      state: "charged",
      enteredOnPly: 6,
    });
  });

  it("orders its effects fight-resolved, then site-charged, then the end-of-action tail's, and pays off at the end of the ply: the node charged by the advance yields energy and a shield", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "G8", 1), ship("red-1", "red", "H8", 0)],
      siteStates: { H8: "active" },
      actionsRemaining: 1,
      plyNumber: 4,
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }

    expect(result.effects[0]).toMatchObject({ type: "fight-resolved" });
    expect(result.effects[1]).toEqual({
      type: "site-charged",
      square: squareFromName("H8"),
      shipId: "green-1",
      side: "green",
      reach: "landed-on",
    });

    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner?.square).toEqual(squareFromName("H8"));

    expect(result.effects).toContainEqual({
      type: "ply-ended",
      side: "green",
      sideToMove: "red",
      endOfTurn: [
        {
          type: "shield-gained",
          shipId: "green-1",
          side: "green",
          square: squareFromName("H8"),
          shields: 1,
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

  it("wakes nothing on a defender's win, even with an active site on the attacker's own square, on the lane, and on the bay the loser is placed in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 1), ship("red-1", "red", "H8", 3)],
      siteStates: { H6: "active", H7: "active", H15: "active" },
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

  it("wakes nothing on a mutual return, even with an active site on both ships' own squares, on the lane, and on both bays the ships are placed in", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H6", 2), ship("red-1", "red", "H8", 2)],
      siteStates: {
        H6: "active",
        H7: "active",
        H8: "active",
        H15: "active",
        L15: "active",
      },
    });

    const result = applyAttack(state, "green-1", squareFromName("H8"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.effects[0]).toMatchObject({ outcome: "mutual-return" });
    expect(result.state.siteStates).toEqual(state.siteStates);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "site-charged" }),
    );
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

  it("drifts the return position on a passed ply too, since §8.7 runs in full for one", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "A2", 4),
        ship("red-1", "red", "A1"),
        ship("red-2", "red", "A3"),
        ship("red-3", "red", "B2"),
      ],
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const result = applyPassGuard(state);

    expect(result.state.returnPositionIndex).not.toBe(
      STARTING_RETURN_POSITION_INDEX,
    );
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
