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
import { legalDestinations } from "../rules/movement";
import { applyMove } from "../rules/ply";
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
  movedThisPly?: readonly ShipId[];
  siteStates?: Readonly<Record<string, SiteState>>;
}): GameState {
  return {
    ships: config.ships,
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: ACTIONS_PER_PLY,
    movedThisPly: config.movedThisPly ?? [],
    plyNumber: 1,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
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

  it("rejects an own ship that has already moved this ply as ship-already-moved", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8")],
      movedThisPly: ["green-1"],
    });
    const result = activate(sessionFor(state), "H8");

    expect(result.selectedShipId).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.lastEvent).toEqual({
      type: "rejected",
      reason: "ship-already-moved",
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

  describe("rejections", () => {
    it("rejects an occupied destination as destination-occupied, leaving the selection and state untouched", () => {
      const state = buildState({
        ships: [ship("green-1", "green", "H8"), ship("red-1", "red", "H9")],
      });
      const selected = activate(sessionFor(state), "H8");

      const result = activate(selected, "H9");

      expect(result.selectedShipId).toBe("green-1");
      expect(result.state).toBe(state);
      expect(result.lastEvent).toEqual({
        type: "rejected",
        reason: "destination-occupied",
        square: squareFromName("H9"),
      });
    });

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
    expect(session.state.movedThisPly).toEqual([]);
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
    // green-1 at A1, with 0 shields, is hemmed in: every one of its reachable
    // squares is either occupied or blocked by a red ship one square away.
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1"),
        ship("red-1", "red", "A2"),
        ship("red-2", "red", "B1"),
        ship("red-3", "red", "B2"),
        ship("red-4", "red", "A3"),
        ship("red-5", "red", "C1"),
        ship("red-6", "red", "B3"),
        ship("red-7", "red", "C3"),
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
