import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
import { startingGameState, type GameState } from "../rules/gameState";
import { createSession } from "../game/session";
import type { NodeChargedEffect } from "../rules/charging";
import type { NodeRanOutEffect, QueueRefilledEffect } from "../rules/endOfTurn";
import type {
  MovedEvent,
  RejectedEvent,
  SelectedEvent,
  Session,
} from "../game/session";
import type {
  NodeSpentEffect,
  PassEffect,
  QueueRotatedEffect,
} from "../rules/ply";
import { boardAnimations } from "./boardAnimations";

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    ships: [],
    nodes: {},
    sideToMove: "green",
    plyNumber: 3,
    randomSeed: 1,
    openingSeed: 1,
    nodeRotation: "continuous",
    rotators: [],
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: "simple",
    ...overrides,
  };
}

function sessionWithEvent(
  event: Session["lastEvent"],
  overrides: Partial<GameState> = {},
): Session {
  return {
    state: buildState(overrides),
    selectedShipId: undefined,
    lastEvent: event,
  };
}

const CHARGED: NodeChargedEffect = {
  type: "node-charged",
  square: squareAt("D", 8),
  priority: 2,
};

const RAN_OUT: NodeRanOutEffect = {
  type: "node-ran-out",
  square: squareAt("H", 8),
};

function movedEventWithEndOfTurn(
  effects: (typeof CHARGED | typeof RAN_OUT | QueueRefilledEffect)[],
): MovedEvent {
  return {
    type: "moved",
    shipId: "green-1",
    side: "green",
    from: squareAt("C", 7),
    to: squareAt("C", 6),
    effects: [
      {
        type: "ply-ended",
        side: "green",
        sideToMove: "red",
        endOfTurn: effects,
      },
    ],
    cost: 0,
    powerAfter: 6,
  };
}

describe("boardAnimations", () => {
  it("returns a charge animation carrying the reported priority", () => {
    const animations = boardAnimations(
      sessionWithEvent(movedEventWithEndOfTurn([CHARGED])),
    );

    expect(animations.get("D8")).toEqual({
      type: "node-charge",
      priority: 2,
      runId: 3,
    });
    expect(animations.size).toBe(1);
  });

  it("returns two charge animations from the same event", () => {
    const secondCharge: NodeChargedEffect = {
      type: "node-charged",
      square: squareAt("K", 11),
      priority: 3,
    };

    const animations = boardAnimations(
      sessionWithEvent(movedEventWithEndOfTurn([CHARGED, secondCharge])),
    );

    expect(animations.get("D8")).toEqual({
      type: "node-charge",
      priority: 2,
      runId: 3,
    });
    expect(animations.get("K11")).toEqual({
      type: "node-charge",
      priority: 3,
      runId: 3,
    });
    expect(animations.size).toBe(2);
  });

  it("returns a burnout animation", () => {
    const animations = boardAnimations(
      sessionWithEvent(movedEventWithEndOfTurn([RAN_OUT])),
    );

    expect(animations.get("H8")).toEqual({ type: "node-burnout", runId: 3 });
    expect(animations.size).toBe(1);
  });

  it("returns both a charge and a burnout from the same event", () => {
    const animations = boardAnimations(
      sessionWithEvent(movedEventWithEndOfTurn([RAN_OUT, CHARGED])),
    );

    expect(animations.get("H8")).toEqual({ type: "node-burnout", runId: 3 });
    expect(animations.get("D8")).toEqual({
      type: "node-charge",
      priority: 2,
      runId: 3,
    });
    expect(animations.size).toBe(2);
  });

  it("returns a burnout animation for a node a ship left and spent", () => {
    const nodeSpent: NodeSpentEffect = {
      type: "node-spent",
      square: squareAt("H", 8),
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("H", 8),
      to: squareAt("H", 7),
      effects: [
        nodeSpent,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };

    const animations = boardAnimations(sessionWithEvent(event));

    expect(animations.get("H8")).toEqual({ type: "node-burnout", runId: 3 });
    expect(animations.size).toBe(1);
  });

  it("turns every rotator still on the board, and never the spent square", () => {
    const rotatorTrigger: QueueRotatedEffect = {
      type: "queue-rotated",
      square: squareAt("E", 5),
      trigger: "rotator",
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("E", 5),
      effects: [
        rotatorTrigger,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };

    const animations = boardAnimations(
      sessionWithEvent(event, {
        nodeRotation: "dedicated",
        rotators: [squareAt("E", 5), squareAt("F", 6), squareAt("G", 9)],
      }),
    );

    expect(animations.size).toBe(2);
    expect(animations.get("F6")).toEqual({ type: "rotator-turn", runId: 3 });
    expect(animations.get("G9")).toEqual({ type: "rotator-turn", runId: 3 });
    expect(animations.get("E5")).toBeUndefined();
  });

  it("turns nothing for a planet-triggered queue-rotated", () => {
    const planetTrigger: QueueRotatedEffect = {
      type: "queue-rotated",
      square: squareAt("E", 5),
      trigger: "planet",
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("E", 5),
      effects: [
        planetTrigger,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };

    const animations = boardAnimations(
      sessionWithEvent(event, {
        nodeRotation: "planet",
        rotators: [],
      }),
    );

    expect(animations.size).toBe(0);
  });

  it("turns nothing when the same event also refilled the rotator set", () => {
    const rotatorTrigger: QueueRotatedEffect = {
      type: "queue-rotated",
      square: squareAt("E", 5),
      trigger: "rotator",
    };
    const refilled: QueueRefilledEffect = {
      type: "queue-refilled",
      discardedSquares: [],
      newNodes: [],
      newRotators: [squareAt("F", 6), squareAt("G", 9), squareAt("H", 3)],
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("E", 5),
      effects: [
        rotatorTrigger,
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [CHARGED, refilled],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };

    const animations = boardAnimations(
      sessionWithEvent(event, {
        nodeRotation: "dedicated",
        rotators: [squareAt("F", 6), squareAt("G", 9), squareAt("H", 3)],
      }),
    );

    expect(animations.get("D8")).toEqual({
      type: "node-charge",
      priority: 2,
      runId: 3,
    });
    expect(animations.size).toBe(1);
  });

  it("returns an empty map for a selected event", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("C", 7),
      destinationCount: 2,
      targetCount: 0,
    };

    expect(boardAnimations(sessionWithEvent(event)).size).toBe(0);
  });

  it("returns an empty map for a rejected event", () => {
    const event: RejectedEvent = {
      type: "rejected",
      reason: "not-your-ship",
      square: squareAt("C", 7),
    };

    expect(boardAnimations(sessionWithEvent(event)).size).toBe(0);
  });

  it("returns an empty map when there is no last event", () => {
    expect(boardAnimations(sessionWithEvent(undefined)).size).toBe(0);
  });

  it("returns an empty map for a top-level pass event with nothing to report", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
      endOfTurn: [],
    };

    expect(boardAnimations(sessionWithEvent(event)).size).toBe(0);
  });

  it("walks a top-level pass event's own end-of-turn list", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
      endOfTurn: [CHARGED],
    };

    const animations = boardAnimations(sessionWithEvent(event));

    expect(animations.get("D8")).toEqual({
      type: "node-charge",
      priority: 2,
      runId: 3,
    });
    expect(animations.size).toBe(1);
  });

  it("animates nothing at the opening deal", () => {
    const session = createSession(startingGameState(1));

    expect(boardAnimations(session).size).toBe(0);
  });
});
