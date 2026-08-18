import { describe, expect, it } from "vitest";
import { squareFromName } from "./board";
import type { ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type SiteStatus,
  startingGameState,
} from "./gameState";
import { applyMove, applyPassGuard } from "./ply";
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
  movedThisPly?: readonly ShipId[];
  siteStates?: Readonly<
    Record<string, SiteState | readonly [SiteState, number]>
  >;
  plyNumber?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? ACTIONS_PER_PLY,
    movedThisPly: config.movedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
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
    expect(first.state.movedThisPly).toEqual(["green-1"]);
    expect(first.effects).toEqual([]);

    const second = applyMove(first.state, "green-2", squareFromName("B1"));
    expect(second.outcome).toBe("applied");
    if (second.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(second.state.sideToMove).toBe("red");
    expect(second.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(second.state.movedThisPly).toEqual([]);
    expect(second.state.plyNumber).toBe(2);
    expect(second.effects).toEqual([
      { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
    ]);
  });

  it("refuses a second move of a ship that has already moved this ply, but allows it again next ply", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
      movedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    const refused = applyMove(state, "green-1", squareFromName("H9"));
    expect(refused).toEqual({
      outcome: "refused",
      reason: "ship-already-moved",
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

describe("applyPassGuard", () => {
  it("passes the ply when the side to move has no legal move with any eligible ship", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1", 4),
        ship("red-1", "red", "B1"),
        ship("red-2", "red", "A2"),
      ],
    });

    const result = applyPassGuard(state);

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.movedThisPly).toEqual([]);
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

  it("runs the end-of-turn sequence for the passing side, so a pinned ship on a charged node still gains a shield", () => {
    // green-1 sits on K5, a charged site, with every one of its shields-3
    // destinations (the eight neighbouring squares) blocked by a red ship,
    // so green has no legal move at all and passes.
    const state = buildState({
      ships: [
        ship("green-1", "green", "K5", 3),
        ship("red-1", "red", "K4"),
        ship("red-2", "red", "K6"),
        ship("red-3", "red", "J5"),
        ship("red-4", "red", "L5"),
        ship("red-5", "red", "J4"),
        ship("red-6", "red", "J6"),
        ship("red-7", "red", "L4"),
        ship("red-8", "red", "L6"),
      ],
      siteStates: { K5: "charged" },
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
      ],
    });
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.shields).toBe(4);
  });
});
