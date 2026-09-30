import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
import { startingGameState, type GameState } from "../rules/gameState";
import { createSession } from "../game/session";
import type { NodeChargedEffect } from "../rules/charging";
import type { NodeStatus } from "../rules/gameState";
import type { ActivityBonusKind } from "../rules/activityBonus";
import type { RecoloredSquare } from "../rules/steal";
import type { NodeRanOutEffect, QueueRefilledEffect } from "../rules/endOfTurn";
import type {
  AttackedEvent,
  MovedEvent,
  RejectedEvent,
  SelectedEvent,
  Session,
} from "../game/session";
import type {
  ActivityBonusClaimedEffect,
  NodeClaimedEffect,
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
    nodePlaystyle: "continuous",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    planetActivity: "off",
    activityBonuses: [],
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: "simple",
    playerMatching: "off",
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

  it("returns a charge animation carrying the signal for a steal claim (steal.md §3)", () => {
    const nodeClaimed: NodeClaimedEffect = {
      type: "node-claimed",
      shipId: "green-1",
      side: "green",
      signal: 2,
      square: squareAt("K", 11),
      discardedSquares: [],
      newProspective: squareAt("D", 4),
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("K", 12),
      to: squareAt("K", 11),
      effects: [
        nodeClaimed,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };

    const animations = boardAnimations(sessionWithEvent(event));

    expect(animations.get("K11")).toEqual({
      type: "node-charge",
      signal: 2,
      runId: 3,
    });
    expect(animations.size).toBe(1);
  });

  it("returns no animation for the square a steal abandon released", () => {
    const nodeAbandoned = {
      type: "node-abandoned" as const,
      signal: 1 as const,
      square: squareAt("D", 4),
      newProspective: squareAt("K", 11),
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("D", 4),
      to: squareAt("D", 5),
      effects: [
        nodeAbandoned,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };

    expect(boardAnimations(sessionWithEvent(event)).size).toBe(0);
  });

  describe("the Node scramble recolour sweep (steal.md §10)", () => {
    function activityClaim(
      kind: ActivityBonusKind,
      recoloredSquares: readonly RecoloredSquare[],
    ): ActivityBonusClaimedEffect {
      return {
        type: "activity-bonus-claimed",
        side: "green",
        square: squareAt("C", 6),
        kind,
        pointsAwarded: 0,
        poweredShipIds: [],
        addedSquares: [],
        recoloredSquares,
        survivor: {
          square: squareAt("M", 9),
          oldKind: "fuel",
          newKind: "fuel",
        },
        newBonus: { square: squareAt("B", 2), kind: "small-points" },
      };
    }

    function movedWith(effects: MovedEvent["effects"]): MovedEvent {
      return {
        type: "moved",
        shipId: "green-1",
        side: "green",
        from: squareAt("C", 7),
        to: squareAt("C", 6),
        effects: [
          ...effects,
          {
            type: "ply-ended",
            side: "green",
            sideToMove: "red",
            endOfTurn: [],
          },
        ],
        cost: 0,
        powerAfter: 6,
      };
    }

    // After the scramble: E5 and J9 moved to another signal; K3 kept its own.
    const nodesAfter: Record<string, NodeStatus> = {
      E5: { state: "prospective", level: 0, signal: 1 },
      J9: { state: "prospective", level: 0, signal: 0 },
      K3: { state: "prospective", level: 0, signal: 2 },
    };
    const steal = {
      nodePlaystyle: "steal" as const,
      planetActivity: "race" as const,
      nodes: nodesAfter,
    };

    it("sweeps exactly the recoloured squares, from their old signals", () => {
      const event = movedWith([
        activityClaim("node-scramble", [
          { square: squareAt("E", 5), oldSignal: 0, newSignal: 1 },
          { square: squareAt("J", 9), oldSignal: 1, newSignal: 0 },
        ]),
      ]);

      const animations = boardAnimations(sessionWithEvent(event, steal));

      expect(animations.get("E5")).toEqual({
        type: "node-recolor",
        fromSignal: 0,
        fromMatchedSide: undefined,
        runId: 3,
      });
      expect(animations.get("J9")).toEqual({
        type: "node-recolor",
        fromSignal: 1,
        fromMatchedSide: undefined,
        runId: 3,
      });
      expect(animations.has("K3")).toBe(false);
      expect(animations.size).toBe(2);
    });

    it("carries the side the old signal was matched to under player-matching (steal.md §9)", () => {
      const event = movedWith([
        activityClaim("node-scramble", [
          { square: squareAt("J", 9), oldSignal: 2, newSignal: 0 },
        ]),
      ]);

      const animations = boardAnimations(
        sessionWithEvent(event, {
          ...steal,
          chargedNodeCount: 3,
          playerMatching: "required",
        }),
      );

      expect(animations.get("J9")).toMatchObject({
        type: "node-recolor",
        fromSignal: 2,
        fromMatchedSide: "green",
      });
    });

    it("sweeps no square the same event made prospective before the scramble, since it had no colour on screen", () => {
      const event = movedWith([
        {
          type: "node-abandoned",
          signal: 0,
          square: squareAt("C", 7),
          newProspective: squareAt("E", 5),
        },
        activityClaim("node-scramble", [
          { square: squareAt("E", 5), oldSignal: 0, newSignal: 1 },
          { square: squareAt("J", 9), oldSignal: 1, newSignal: 0 },
        ]),
      ]);

      const animations = boardAnimations(sessionWithEvent(event, steal));

      expect(animations.has("E5")).toBe(false);
      expect(animations.get("J9")).toMatchObject({ fromSignal: 1 });
      expect(animations.size).toBe(1);
    });

    it("sweeps no square an earlier claim in the same fight added (Additional nodes)", () => {
      const event: AttackedEvent = {
        type: "attacked",
        shipId: "green-1",
        side: "green",
        from: squareAt("C", 7),
        target: squareAt("C", 8),
        effects: [
          {
            ...activityClaim("additional-nodes", []),
            addedSquares: [squareAt("E", 5)],
          },
          activityClaim("node-scramble", [
            { square: squareAt("E", 5), oldSignal: 0, newSignal: 1 },
            { square: squareAt("J", 9), oldSignal: 1, newSignal: 0 },
          ]),
        ],
      };

      const animations = boardAnimations(sessionWithEvent(event, steal));

      expect(animations.has("E5")).toBe(false);
      expect(animations.get("J9")).toMatchObject({ fromSignal: 1 });
      expect(animations.size).toBe(1);
    });

    it("sweeps nothing for any other kind of claim", () => {
      const event = movedWith([activityClaim("additional-nodes", [])]);

      expect(boardAnimations(sessionWithEvent(event, steal)).size).toBe(0);
    });

    it("sweeps from the first claim's old signal when a fight's two claims recolour the same square, and not at all when the square ends on its old signal", () => {
      const event: AttackedEvent = {
        type: "attacked",
        shipId: "green-1",
        side: "green",
        from: squareAt("C", 7),
        target: squareAt("C", 8),
        effects: [
          activityClaim("node-scramble", [
            { square: squareAt("E", 5), oldSignal: 2, newSignal: 0 },
            { square: squareAt("K", 3), oldSignal: 2, newSignal: 1 },
          ]),
          activityClaim("node-scramble", [
            { square: squareAt("E", 5), oldSignal: 0, newSignal: 1 },
            { square: squareAt("K", 3), oldSignal: 1, newSignal: 2 },
          ]),
        ],
      };

      const animations = boardAnimations(sessionWithEvent(event, steal));

      expect(animations.get("E5")).toMatchObject({
        type: "node-recolor",
        fromSignal: 2,
      });
      expect(animations.has("K3")).toBe(false);
      expect(animations.size).toBe(1);
    });
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
        nodePlaystyle: "dedicated",
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
        nodePlaystyle: "planet",
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
        nodePlaystyle: "dedicated",
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
