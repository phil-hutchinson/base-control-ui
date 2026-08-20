import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import { squareFromName } from "../rules/board";
import type { ShipId, Side } from "../rules/fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  type SiteStatus,
} from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { legalTargets } from "../rules/combat";
import { legalDestinations } from "../rules/movement";
import { applyAttack, applyMove } from "../rules/ply";
import type { ShieldCount } from "../rules/shields";
import type { SiteState } from "../rules/sites";
import { createSession, type Session, sessionReducer } from "./session";

function ship(
  id: ShipId,
  side: Side,
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
  sideToMove?: Side;
  actedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
  plyNumber?: number;
  lengthInRounds?: number;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
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
        ship("green-1", "green", "H8", 1),
        ship("red-1", "red", "H10", 0),
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
          ship("green-1", "green", "H8", 4),
          ship("red-1", "red", "H9", 0),
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

    it("rejects a dormant site as destination-dormant-site", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8")],
        siteStates: { H9: "dormant" },
      });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "destination-dormant-site",
        square: squareFromName("H9"),
      });
    });

    it("rejects a depleted site as destination-depleted-site", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8")],
        siteStates: { H9: "depleted" },
      });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "destination-depleted-site",
        square: squareFromName("H9"),
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
  it("passes the turn after two actions, and the moved event says so", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "A1"),
        ship("red-1", "red", "O1"),
      ],
    });

    let session = sessionFor(state);
    session = activate(session, "H8");
    session = activate(session, "H9");

    expect(session.state.sideToMove).toBe("green");
    expect(session.state.actionsRemaining).toBe(1);
    expect(session.lastEvent).toMatchObject({
      type: "moved",
      shipId: "green-1",
    });
    if (session.lastEvent?.type === "moved") {
      expect(session.lastEvent.effects).toEqual([]);
    }

    session = activate(session, "A1");
    session = activate(session, "A2");

    expect(session.state.sideToMove).toBe("red");
    expect(session.state.actionsRemaining).toBe(ACTIONS_PER_PLY);
    expect(session.state.actedThisPly).toEqual([]);
    expect(session.lastEvent).toMatchObject({
      type: "moved",
      shipId: "green-2",
      to: squareFromName("A2"),
    });
    if (session.lastEvent?.type === "moved") {
      expect(session.lastEvent.effects).toContainEqual({
        type: "ply-ended",
        side: "green",
        sideToMove: "red",
        endOfTurn: [],
      });
    }
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
    // green-1 is in the A2 bay, with 0 shields: every one of its reachable
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
      endOfTurn: [],
    });
  });
});

describe("sessionReducer — once the game is over", () => {
  const state = buildState({
    ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
    plyNumber: 201,
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
      plyNumber: 201,
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
    });

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state.plyNumber).toBe(1);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
    expect(result.state.randomSeed).toBe(42);
    expect(result.state.lengthInRounds).toBe(100);
  });

  it("honours a non-default length rather than the game's default", () => {
    const session = sessionFor(buildState({ ships: [] }));

    const result = sessionReducer(session, {
      type: "new-game",
      randomSeed: 7,
      lengthInRounds: 3,
    });

    expect(result.state.lengthInRounds).toBe(3);
  });

  it("honours the given seed rather than drawing its own", () => {
    const session = sessionFor(buildState({ ships: [] }));

    const first = sessionReducer(session, {
      type: "new-game",
      randomSeed: 1,
      lengthInRounds: 5,
    });
    const second = sessionReducer(session, {
      type: "new-game",
      randomSeed: 2,
      lengthInRounds: 5,
    });

    expect(first.state.randomSeed).not.toBe(second.state.randomSeed);
  });
});
