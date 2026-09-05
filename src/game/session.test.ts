import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "../rules/board";
import {
  DEFAULT_FLEET_SIZE,
  startingFleet,
  type FleetSize,
  type ShipId,
  type Side,
} from "../rules/fleet";
import {
  ACTIONS_PER_PLY,
  startingGameState,
  type GameState,
  type Ship,
  type NodeStatus,
} from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { legalTargets } from "../rules/combat";
import { legalDestinations } from "../rules/movement";
import { applyAttack, applyMove } from "../rules/ply";
import type { PowerLevel } from "../rules/power";
import type { NodeState } from "../rules/nodes";
import { createSession, type Session, sessionReducer } from "./session";

function ship(
  id: ShipId,
  side: Side,
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
  sideToMove?: Side;
  actedThisPly?: readonly ShipId[];
  nodes?: Readonly<Record<string, NodeState>>;
  plyNumber?: number;
  lengthInRounds?: number;
  outOfTime?: Readonly<Record<Side, boolean>>;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: config.outOfTime ?? { green: false, red: false },
  };
}

function sessionFor(state: GameState): Session {
  return { state, selectedShipId: undefined, lastEvent: undefined };
}

function activate(session: Session, square: string): Session {
  return sessionReducer(session, {
    type: "activate",
    square: squareFromName(square),
  });
}

const dismiss = (session: Session): Session =>
  sessionReducer(session, { type: "dismiss" });

describe("sessionReducer — nothing selected", () => {
  it("selects an own ship that has not moved, reporting its destination count", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const result = activate(sessionFor(state), "H8");

    expect(result.selectedShipId).toBe("green-1");
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      destinationCount: legalDestinations(state, "green-1").length,
      targetCount: legalTargets(state, "green-1").length,
    });
  });

  it("reports a target count that includes a target beyond the eight neighbours", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("red-1", "red", "H10", 4),
      ],
    });
    const result = activate(sessionFor(state), "H8");

    const targets = legalTargets(state, "green-1");
    expect(targets).toContainEqual(squareFromName("H10"));
    expect(result.lastEvent).toEqual({
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      destinationCount: legalDestinations(state, "green-1").length,
      targetCount: targets.length,
    });
  });

  it("rejects an opponent's ship as not-your-ship", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
    });
    const before = sessionFor(state);
    const result = activate(before, "A1");

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "not-your-ship",
      square: squareFromName("A1"),
    });
  });

  it("rejects an own ship that has already acted this ply as ship-already-acted", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      actedThisPly: ["green-1"],
    });
    const result = activate(sessionFor(state), "H8");

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "ship-already-acted",
      square: squareFromName("H8"),
    });
  });

  it("rejects an empty square as nothing to select there", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const result = activate(sessionFor(state), "A5");

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "nothing-to-select",
      square: squareFromName("A5"),
    });
  });
});

describe("sessionReducer — a ship is selected", () => {
  it("cancels the selection when its own square is activated again", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const selected = activate(sessionFor(state), "H8");

    const result = activate(selected, "H8");

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({ type: "selection-cleared" });
  });

  it("switches the selection to another own ship that has not moved, without moving or spending an action", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("green-2", "green", "A1")],
    });
    const selected = activate(sessionFor(state), "H8");

    const result = activate(selected, "A1");

    expect(result.selectedShipId).toBe("green-2");
    expect(result.state).toBe(state);
    expect(result.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(result.state.ships).toEqual(state.ships);
    expect(result.lastEvent).toEqual({
      type: "selected",
      shipId: "green-2",
      side: "green",
      square: squareFromName("A1"),
      destinationCount: legalDestinations(state, "green-2").length,
      targetCount: legalTargets(state, "green-2").length,
    });
  });

  it("moves the ship and clears the selection when a legal destination is activated", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const selected = activate(sessionFor(state), "H8");
    const destination = squareFromName("H9");

    const result = activate(selected, "H9");

    expect(result.selectedShipId).toBeUndefined();
    const direct = applyMove(state, "green-1", destination);
    expect(direct.outcome).toBe("applied");
    if (direct.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state).toEqual(direct.state);
    expect(result.lastEvent).toEqual({
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareFromName("H8"),
      to: destination,
      effects: direct.effects,
      actionsRemaining: direct.state.actionsRemaining,
    });
  });

  describe("the attack gesture", () => {
    it("attacks an adjacent enemy ship, clearing the selection", () => {
      const state = buildState({
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("red-1", "red", "H9", 4),
        ],
      });
      const selected = activate(sessionFor(state), "H8");
      const target = squareFromName("H9");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBeUndefined();
      const direct = applyAttack(state, "green-1", target);
      expect(direct.outcome).toBe("applied");
      if (direct.outcome !== "applied") {
        throw new Error("expected the attack to be applied");
      }
      expect(result.state).toEqual(direct.state);
      expect(result.lastEvent).toEqual({
        type: "attacked",
        shipId: "green-1",
        side: "green",
        from: squareFromName("H8"),
        target,
        effects: direct.effects,
        actionsRemaining: direct.state.actionsRemaining,
      });
    });

    it("rejects a distant enemy as out of attack range, not as a blocked or occupied move", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "A1")],
      });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "A1");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "target-out-of-range",
        square: squareFromName("A1"),
      });
    });

    it("rejects a friendly ship that has already acted as ship-already-acted, whether or not it still has a target in range", () => {
      const withTarget = buildState({
        ships: [
          ship("green-1", "green", "H8"),
          ship("green-2", "green", "K5"),
          ship("red-1", "red", "K6"),
        ],
        actedThisPly: ["green-2"],
      });
      const selectedWithTarget = activate(sessionFor(withTarget), "H8");

      const resultWithTarget = activate(selectedWithTarget, "K5");

      expect(resultWithTarget.selectedShipId).toBe("green-1");
      expect(resultWithTarget.state).toBe(withTarget);
      expect(resultWithTarget.lastEvent).toEqual({
        type: "rejected",
        reason: "ship-already-acted",
        square: squareFromName("K5"),
      });

      const withoutTarget = buildState({
        ships: [
          ship("green-1", "green", "H8"),
          ship("green-2", "green", "K5"),
          ship("red-1", "red", "A1"),
        ],
        actedThisPly: ["green-2"],
      });
      const selectedWithoutTarget = activate(sessionFor(withoutTarget), "H8");

      const resultWithoutTarget = activate(selectedWithoutTarget, "K5");

      expect(resultWithoutTarget.selectedShipId).toBe("green-1");
      expect(resultWithoutTarget.state).toBe(withoutTarget);
      expect(resultWithoutTarget.lastEvent).toEqual({
        type: "rejected",
        reason: "ship-already-acted",
        square: squareFromName("K5"),
      });
    });
  });

  describe("rejections", () => {
    it("rejects a square beyond the ship's reach as out-of-range", () => {
      const state = buildState({ ships: [ship("green-1", "green", "H8")] });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "A1");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "out-of-range",
        square: squareFromName("A1"),
      });
    });

    it("rejects a destination beyond a blocking ship as path-blocked", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
      });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "H11");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "path-blocked",
        square: squareFromName("H11"),
      });
    });

    it("applies a move ending on an inactive node", () => {
      // Five charged nodes elsewhere hold the board at its target, so the
      // end-of-turn charge draw this move triggers has no shortfall to
      // fill and never has to weigh H9 alone.
      const state = buildState({
        ships: [ship("green-1", "green", "H8")],
        nodes: {
          H9: "inactive",
          C3: "charged",
          F3: "charged",
          C6: "charged",
          F6: "charged",
          C9: "charged",
        },
      });
      const selected = activate(sessionFor(state), "H8");
      const destination = squareFromName("H9");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBeUndefined();
      const direct = applyMove(state, "green-1", destination);
      expect(direct.outcome).toBe("applied");
      if (direct.outcome !== "applied") {
        throw new Error("expected the move to be applied");
      }
      expect(result.state).toEqual(direct.state);
      expect(result.lastEvent).toEqual({
        type: "moved",
        shipId: "green-1",
        side: "green",
        from: squareFromName("H8"),
        to: destination,
        effects: direct.effects,
        actionsRemaining: direct.state.actionsRemaining,
      });
    });

    it("applies a move ending on a depleted node", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8")],
        nodes: { H9: "depleted" },
      });
      const selected = activate(sessionFor(state), "H8");
      const destination = squareFromName("H9");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBeUndefined();
      const direct = applyMove(state, "green-1", destination);
      expect(direct.outcome).toBe("applied");
      if (direct.outcome !== "applied") {
        throw new Error("expected the move to be applied");
      }
      expect(result.state).toEqual(direct.state);
      expect(result.lastEvent).toEqual({
        type: "moved",
        shipId: "green-1",
        side: "green",
        from: squareFromName("H8"),
        to: destination,
        effects: direct.effects,
        actionsRemaining: direct.state.actionsRemaining,
      });
    });
  });
});

describe("sessionReducer — dismiss", () => {
  it("clears a selection", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const selected = activate(sessionFor(state), "H8");

    const result = dismiss(selected);

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({ type: "selection-cleared" });
  });

  it("is harmless when nothing is selected", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });
    const session = activate(sessionFor(state), "A5");

    const result = dismiss(session);

    expect(result).toEqual(session);
  });
});

describe("sessionReducer — a full ply", () => {
  it("passes the turn after one action, and the moved event says so", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O1")],
    });

    let session = sessionFor(state);
    session = activate(session, "H8");
    session = activate(session, "H9");

    expect(session.state.sideToMove).toBe("red");
    expect(session.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(session.state.actedThisPly).toEqual([]);
    expect(session.lastEvent).toMatchObject({
      type: "moved",
      shipId: "green-1",
      to: squareFromName("H9"),
    });
    if (session.lastEvent?.type === "moved") {
      expect(session.lastEvent.effects).toContainEqual({
        type: "ply-ended",
        side: "green",
        sideToMove: "red",
        endOfTurn: [],
      });
    }

    // Red's own single action, proving the ply really did pass to it.
    session = activate(session, "O1");
    session = activate(session, "O2");

    expect(session.state.sideToMove).toBe("green");
    expect(session.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(session.state.actedThisPly).toEqual([]);
    expect(session.lastEvent).toMatchObject({
      type: "moved",
      shipId: "red-1",
      to: squareFromName("O2"),
    });
  });
});

describe("createSession", () => {
  it("starts with nothing selected and no event when the side to move has a legal move", () => {
    const state = buildState({ ships: [ship("green-1", "green", "H8")] });

    const session = createSession(state);

    expect(session.selectedShipId).toBeUndefined();
    expect(session.lastEvent).toBeUndefined();
    expect(session.state).toEqual(state);
  });

  it("runs the pass guard once, so a stuck starting position passes immediately", () => {
    // green-1 is in the A2 bay, at full power: every one of its reachable
    // squares is either occupied by a red ship one square away or blocked
    // along the way to a farther one, and §3.1 forbids it to attack from a
    // bay regardless.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A2"),
        ship("red-1", "red", "A1"),
        ship("red-2", "red", "A3"),
        ship("red-3", "red", "B2"),
        ship("red-4", "red", "B1"),
        ship("red-5", "red", "B3"),
      ],
    });

    const session = createSession(state);

    expect(session.state.sideToMove).toBe("red");
    expect(session.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(session.state.plyNumber).toBe(2);
    expect(session.lastEvent).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "no-legal-action",
      endOfTurn: [],
    });
  });
});

describe("sessionReducer — once the game is over", () => {
  const state = buildState({
    ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
    plyNumber: 61,
  });

  it("rejects activating a friendly ship with game-over", () => {
    const result = activate(sessionFor(state), "H8");

    expect(result.state).toBe(state);
    expect(result.selectedShipId).toBeUndefined();
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "game-over",
      square: squareFromName("H8"),
    });
  });

  it("rejects activating an enemy ship with game-over", () => {
    const result = activate(sessionFor(state), "H9");

    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "game-over",
      square: squareFromName("H9"),
    });
  });

  it("rejects activating an empty square with game-over", () => {
    const result = activate(sessionFor(state), "A1");

    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "game-over",
      square: squareFromName("A1"),
    });
  });

  it("rejects activating a would-be-legal destination with game-over", () => {
    // A selection reached this session directly rather than through the
    // reducer, since the reducer itself now refuses a selection once the
    // game is over — this exercises the already-selected path's guard too.
    const withSelection: Session = {
      ...sessionFor(state),
      selectedShipId: "green-1",
    };

    const result = activate(withSelection, "H9");

    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "game-over",
      square: squareFromName("H9"),
    });
  });

  it("still clears a selection on dismiss", () => {
    const withSelection: Session = {
      ...sessionFor(state),
      selectedShipId: "green-1",
    };

    const result = dismiss(withSelection);

    expect(result.state).toBe(state);
    expect(result.selectedShipId).toBeUndefined();
    expect(result.lastEvent).toEqual({ type: "selection-cleared" });
  });
});

describe("sessionReducer — new-game", () => {
  it("starts a fresh session at ply 1, both totals 0, with the given seed and length", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      plyNumber: 61,
    });
    const session: Session = {
      state,
      selectedShipId: "green-1",
      lastEvent: undefined,
    };

    const result = sessionReducer(session, {
      type: "new-game",
      randomSeed: 42,
      lengthInRounds: 100,
      fleetSize: DEFAULT_FLEET_SIZE,
    });

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state.plyNumber).toBe(1);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
    // Not the literal seed the intent carried: `startingGameState` advances
    // it dealing the opening board, and the reducer must carry that seed
    // rather than the one it started from.
    expect(result.state.randomSeed).toBe(
      startingGameState(42, 100, DEFAULT_FLEET_SIZE).randomSeed,
    );
    expect(result.state.lengthInRounds).toBe(100);
  });

  it("honours a non-default length rather than the game's default", () => {
    const session = sessionFor(buildState({ ships: [] }));

    const result = sessionReducer(session, {
      type: "new-game",
      randomSeed: 7,
      lengthInRounds: 3,
      fleetSize: DEFAULT_FLEET_SIZE,
    });

    expect(result.state.lengthInRounds).toBe(3);
  });

  it("honours the given seed rather than drawing its own", () => {
    const session = sessionFor(buildState({ ships: [] }));

    const first = sessionReducer(session, {
      type: "new-game",
      randomSeed: 1,
      lengthInRounds: 5,
      fleetSize: DEFAULT_FLEET_SIZE,
    });
    const second = sessionReducer(session, {
      type: "new-game",
      randomSeed: 2,
      lengthInRounds: 5,
      fleetSize: DEFAULT_FLEET_SIZE,
    });

    expect(first.state.randomSeed).not.toBe(second.state.randomSeed);
  });

  it.each<FleetSize>([7, 6, 5])(
    "honours the given fleet size, dealing %i ships a side on its own layout",
    (fleetSize) => {
      const session = sessionFor(buildState({ ships: [] }));

      const result = sessionReducer(session, {
        type: "new-game",
        randomSeed: 9,
        lengthInRounds: 30,
        fleetSize,
      });

      const expectedFleet = startingFleet(fleetSize);
      expect(result.state.ships).toHaveLength(expectedFleet.length);
      expect(
        result.state.ships.filter((ship) => ship.side === "green"),
      ).toHaveLength(fleetSize);
      expect(
        result.state.ships.filter((ship) => ship.side === "red"),
      ).toHaveLength(fleetSize);
      expect(
        new Set(result.state.ships.map((ship) => squareName(ship.square))),
      ).toEqual(
        new Set(expectedFleet.map((entry) => squareName(entry.square))),
      );
      // Not the literal seed the intent carried — see the seed assertion
      // above.
      expect(result.state.randomSeed).toBe(
        startingGameState(9, 30, fleetSize).randomSeed,
      );
      expect(result.state.lengthInRounds).toBe(30);
    },
  );
});

describe("sessionReducer — a side is out of time", () => {
  it("rejects selecting a ship for the out-of-time side to move", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: true, red: false },
    });

    const result = activate(sessionFor(state), "H8");

    expect(result.state).toBe(state);
    expect(result.selectedShipId).toBeUndefined();
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "out-of-time",
      square: squareFromName("H8"),
    });
  });

  it("rejects completing a move from an already-selected ship for the out-of-time side to move", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: true, red: false },
    });
    const withSelection: Session = {
      ...sessionFor(state),
      selectedShipId: "green-1",
    };

    const result = activate(withSelection, "H7");

    expect(result.state).toBe(state);
    expect(result.selectedShipId).toBe("green-1");
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "out-of-time",
      square: squareFromName("H7"),
    });
  });

  it("leaves the side to move with time left unaffected", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: false, red: true },
    });

    const result = activate(sessionFor(state), "H8");

    expect(result.selectedShipId).toBe("green-1");
    expect(result.lastEvent).toEqual({
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
      destinationCount: legalDestinations(state, "green-1").length,
      targetCount: legalTargets(state, "green-1").length,
    });
  });
});

describe("sessionReducer — clock-expired", () => {
  it("marks the named side out of time, leaving the other side and lastEvent untouched", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
    });
    const session = sessionFor(state);

    const result = sessionReducer(session, {
      type: "clock-expired",
      side: "green",
    });

    expect(result.state.outOfTime).toEqual({ green: true, red: false });
    expect(result.selectedShipId).toBeUndefined();
    expect(result.lastEvent).toBeUndefined();
  });

  it("is a no-op — returning the same session object — when the side is already out of time", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: true, red: false },
    });
    const session = sessionFor(state);

    const result = sessionReducer(session, {
      type: "clock-expired",
      side: "green",
    });

    expect(result).toBe(session);
  });

  it("ends the game once both sides have expired, after which an activation is rejected as game-over", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
    });
    const session = sessionFor(state);

    const green = sessionReducer(session, {
      type: "clock-expired",
      side: "green",
    });
    const both = sessionReducer(green, {
      type: "clock-expired",
      side: "red",
    });

    expect(both.state.outOfTime).toEqual({ green: true, red: true });

    const result = activate(both, "H8");

    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "game-over",
      square: squareFromName("H8"),
    });
  });
});

describe("sessionReducer — pass-out-of-time", () => {
  it("passes the side to move's turn, advancing the ply and recording the out-of-time pass as lastEvent", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: true, red: false },
    });
    const session = sessionFor(state);

    const result = sessionReducer(session, { type: "pass-out-of-time" });

    expect(result.state.sideToMove).toBe("red");
    expect(result.state.plyNumber).toBe(state.plyNumber + 1);
    expect(result.lastEvent).toEqual({
      type: "ply-passed",
      side: "green",
      sideToMove: "red",
      reason: "out-of-time",
      endOfTurn: [],
    });
  });

  it("is a no-op for a side that still has time", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
    });
    const session = sessionFor(state);

    const result = sessionReducer(session, { type: "pass-out-of-time" });

    expect(result).toBe(session);
  });

  it("clears a selection", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "O2")],
      outOfTime: { green: true, red: false },
    });
    const withSelection: Session = {
      state,
      selectedShipId: "green-1",
      lastEvent: undefined,
    };

    const result = sessionReducer(withSelection, {
      type: "pass-out-of-time",
    });

    expect(result.selectedShipId).toBeUndefined();
  });
});
