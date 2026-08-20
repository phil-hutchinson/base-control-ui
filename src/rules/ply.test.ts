import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX, isBay } from "./bays";
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

  it("spends two actions before passing the turn, then clears the moved-this-ply marks", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "O15"),
      ],
    });

    const first = applyMove(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(first.state.sideToMove).toBe("green");
    expect(first.state.actionsRemaining).toBe(1);
    expect(first.state.actedThisPly).toEqual(["green-1"]);
    expect(first.effects).toEqual([]);

    const second = applyMove(first.state, "green-2", squareFromName("B1"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(second.state.sideToMove).toBe("red");
    expect(second.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(second.state.actedThisPly).toEqual([]);
    expect(second.state.plyNumber).toBe(2);
    expect(second.effects).toEqual([
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("leaves the return position unchanged between a ply's two actions, and drifts it once the ply ends", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "O15"),
      ],
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const first = applyMove(state, "green-1", squareFromName("H9"));
    if (first.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(first.state.returnPositionIndex).toBe(
      STARTING_RETURN_POSITION_INDEX,
    );

    const second = applyMove(first.state, "green-2", squareFromName("B1"));
    if (second.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(second.state.returnPositionIndex).not.toBe(
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

    // Green's next ply: two actions available again, nothing moved yet.
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
    // green-2, uninvolved, keeps green with a legal move left after the
    // fight so the pass guard does not also fire and add its own effect.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 1),
      ],
    });
    const before = structuredClone(state);

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const winner = result.state.ships.find((s) => s.id === "green-1");
    expect(winner).toEqual(ship("green-1", "green", "H9", 1));
    const loser = result.state.ships.find((s) => s.id === "red-1");
    expect(loser).toEqual(ship("red-1", "red", "H15", 0));

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
            to: squareFromName("H15"),
          },
        ],
      },
    ]);

    // The input state itself is never mutated.
    expect(state).toEqual(before);
  });

  it("resolves a defender's win: the attacker returns to a bay at 0, the defender stays put and keeps the fight's shields", () => {
    // green-2, uninvolved, keeps green with a legal move left after the
    // fight so the pass guard does not also fire and add its own effect.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 3),
      ],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker).toEqual(ship("green-1", "green", "H15", 0));
    const defender = result.state.ships.find((s) => s.id === "red-1");
    expect(defender).toEqual(ship("red-1", "red", "H9", 1));

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
            to: squareFromName("H15"),
          },
        ],
      },
    ]);
  });

  it("resolves a mutual return on equal shields: both ships return to bays at 0, the attacker placed first", () => {
    // green-2, uninvolved, keeps green with a legal move left after the
    // fight so the pass guard does not also fire and add its own effect.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 2),
      ],
    });

    const result = applyAttack(state, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const attacker = result.state.ships.find((s) => s.id === "green-1");
    expect(attacker).toEqual(ship("green-1", "green", "H15", 0));
    const defender = result.state.ships.find((s) => s.id === "red-1");
    expect(defender).toEqual(ship("red-1", "red", "L15", 0));

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
            to: squareFromName("H15"),
          },
          {
            shipId: "red-1",
            side: "red",
            from: squareFromName("H9"),
            to: squareFromName("L15"),
          },
        ],
      },
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
    // Not the ply's last action, so the end-of-turn sequence never runs and
    // siteStates is untouched — same reference, not merely equal contents.
    // A site already charged is not re-charged by §8.2, so the advance onto
    // it leaves its clock exactly where it was.
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

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    const countBySide = (s: GameState, side: "green" | "red") =>
      s.ships.filter((ship) => ship.side === side).length;
    expect(countBySide(first.state, "green")).toBe(7);
    expect(countBySide(first.state, "red")).toBe(7);

    const second = applyAttack(first.state, "green-2", squareFromName("B1"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(countBySide(second.state, "green")).toBe(7);
    expect(countBySide(second.state, "red")).toBe(7);
    expect(second.state.ships.length).toBe(14);
  });

  it("returns the loser to the first empty bay from position 1, and to the next one when position 1 is occupied", () => {
    const empty = buildState({
      ships: [ship("green-1", "green", "H8", 3), ship("red-1", "red", "H9", 0)],
    });
    const emptyResult = applyAttack(empty, "green-1", squareFromName("H9"));
    if (emptyResult.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(
      emptyResult.state.ships.find((s) => s.id === "red-1")?.square,
    ).toEqual(squareFromName("H15"));

    const occupied = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("red-1", "red", "H9", 0),
        ship("red-2", "red", "H15"),
      ],
    });
    const occupiedResult = applyAttack(
      occupied,
      "green-1",
      squareFromName("H9"),
    );
    if (occupiedResult.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(
      occupiedResult.state.ships.find((s) => s.id === "red-1")?.square,
    ).toEqual(squareFromName("L15"));
  });

  it("recomputes the receptacle live: a ship moved out of a bay as the first action changes where the second action's beaten ship lands", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H15", 0),
        ship("green-2", "green", "K5", 2),
        ship("red-1", "red", "K6", 1),
      ],
    });

    const first = applyMove(state, "green-1", squareFromName("H12"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }

    const second = applyAttack(first.state, "green-2", squareFromName("K6"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(second.state.ships.find((s) => s.id === "red-1")?.square).toEqual(
      squareFromName("H15"),
    );
  });

  it("does not drift the return position between a ply's two actions, but drifts it once the ply ends", () => {
    // A ship may take at most one action per turn (rules.md §5), so the
    // ply's two attacks come from two different ships.
    const state = buildState({
      ships: [
        ship("green-1", "green", "K5", 4),
        ship("green-2", "green", "L4", 4),
        ship("red-1", "red", "K6", 0),
        ship("red-2", "red", "K4", 0),
      ],
      returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    });

    const first = applyAttack(state, "green-1", squareFromName("K6"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.returnPositionIndex).toBe(
      STARTING_RETURN_POSITION_INDEX,
    );

    const second = applyAttack(first.state, "green-2", squareFromName("K4"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(second.state.returnPositionIndex).not.toBe(
      STARTING_RETURN_POSITION_INDEX,
    );

    const firstAttacker = second.state.ships.find((s) => s.id === "green-1");
    expect(firstAttacker?.square).toEqual(squareFromName("K6"));
    expect(firstAttacker?.shields).toBe(3);
    const secondAttacker = second.state.ships.find((s) => s.id === "green-2");
    expect(secondAttacker?.square).toEqual(squareFromName("K4"));
    expect(secondAttacker?.shields).toBe(3);
  });

  it("refuses a second attack by the same ship, even though it won the first and a second target stands in range", () => {
    // green-2, uninvolved, keeps green with a legal action left after the
    // first attack so the pass guard does not fire before the second is
    // attempted.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 0),
        ship("red-2", "red", "G9", 0),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the first attack to be applied");
    }
    expect(first.state.actedThisPly).toEqual(["green-1"]);

    const second = applyAttack(first.state, "green-1", squareFromName("G9"));

    expect(second).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses a move by a ship that attacked as the ply's first action", () => {
    // green-2, uninvolved, keeps green with a legal action left after the
    // attack so the pass guard does not fire before the move is attempted.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 1),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.actedThisPly).toEqual(["green-1"]);

    const second = applyMove(first.state, "green-1", squareFromName("H9"));

    expect(second).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("refuses an attack by a ship that moved as the ply's first action", () => {
    // green-2, uninvolved, keeps green with a legal action left after the
    // move so the pass guard does not fire before the attack is attempted.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H10"),
      ],
    });

    const first = applyMove(state, "green-1", squareFromName("H9"));
    if (first.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(first.state.actedThisPly).toEqual(["green-1"]);

    const second = applyAttack(first.state, "green-1", squareFromName("H10"));

    expect(second).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });
  });

  it("lets two different ships each attack as the ply's two actions", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1", 3),
        ship("red-1", "red", "H9", 1),
        ship("red-2", "red", "B1"),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("H9"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }

    const second = applyAttack(first.state, "green-2", squareFromName("B1"));
    expect(second.outcome).toBe("applied");
  });

  it("lets one ship move and a different ship attack, in either order, as the ply's two actions", () => {
    const moveThenAttack = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1", 3),
        ship("red-1", "red", "B1"),
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
    const secondAttack = applyAttack(
      firstMove.state,
      "green-2",
      squareFromName("B1"),
    );
    expect(secondAttack.outcome).toBe("applied");

    const attackThenMove = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H9", 1),
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
    const secondMove = applyMove(
      firstAttack.state,
      "green-2",
      squareFromName("B1"),
    );
    expect(secondMove.outcome).toBe("applied");
  });

  it("refuses both a second move and an attack for a ship that has already acted this ply", () => {
    // green-2, uninvolved, keeps green with a legal action left after the
    // move so the pass guard does not fire before the second action is
    // attempted.
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "H10"),
      ],
    });

    const first = applyMove(state, "green-1", squareFromName("H9"));
    if (first.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }

    const secondMove = applyMove(first.state, "green-1", squareFromName("G9"));
    expect(secondMove).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    const secondAttack = applyAttack(
      first.state,
      "green-1",
      squareFromName("H10"),
    );
    expect(secondAttack).toEqual({
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
      ships: [
        ship("green-1", "green", "K5", 2),
        ship("green-2", "green", "A1", 2),
        ship("red-1", "red", "K6", 2),
        ship("red-2", "red", "B1"),
      ],
    });

    const first = applyAttack(state, "green-1", squareFromName("K6"));
    expect(first.outcome).toBe("applied");
    if (first.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(first.state.actedThisPly).toEqual(["green-1"]);
    const returnedShip = first.state.ships.find((s) => s.id === "green-1");
    expect(returnedShip?.square).toEqual(squareFromName("H15"));

    const secondByReturnedShip = applyMove(
      first.state,
      "green-1",
      squareFromName("H12"),
    );
    expect(secondByReturnedShip).toEqual({
      outcome: "refused",
      reason: "ship-already-acted",
    });

    // The mutual return is the side to move's own attacker returning; the
    // opponent's ship it fought is not the side to move's concern, and the
    // ply's second action is a different green ship's, exactly as normal.
    const second = applyAttack(first.state, "green-2", squareFromName("B1"));
    expect(second.outcome).toBe("applied");
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
