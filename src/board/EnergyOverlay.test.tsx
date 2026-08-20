// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import type { EnergyCollectedEffect } from "../rules/endOfTurn";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";
import type { PassEffect } from "../rules/ply";
import type { MovedEvent, Session, SessionEvent } from "../game/session";
import { EnergyOverlay } from "./EnergyOverlay";

afterEach(cleanup);

function buildState(plyNumber: number): GameState {
  return {
    ships: [],
    siteStates: {},
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

function sessionWithEvent(event: SessionEvent | undefined): Session {
  return { state: buildState(3), selectedShipId: undefined, lastEvent: event };
}

const THREE_NODE_COLLECTION: EnergyCollectedEffect = {
  type: "energy-collected",
  side: "green",
  amount: 6,
  newTotal: 24,
  squares: [squareAt("D", 8), squareAt("H", 8), squareAt("K", 11)],
};

function movedEventWithCollection(
  effect: EnergyCollectedEffect | undefined,
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
        endOfTurn: effect === undefined ? [] : [effect],
      },
    ],
    actionsRemaining: 1,
  };
}

describe("EnergyOverlay", () => {
  it("renders nothing when the session has no last event at all", () => {
    const { container } = render(
      <EnergyOverlay session={sessionWithEvent(undefined)} />,
    );

    expect(container.querySelectorAll(".energy-overlay__gain")).toHaveLength(0);
    expect(container.querySelectorAll(".energy-overlay__pulse")).toHaveLength(
      0,
    );
  });

  it("draws one +N and one pulse per paying square, in the collecting side's colour", () => {
    const { container } = render(
      <EnergyOverlay
        session={sessionWithEvent(
          movedEventWithCollection(THREE_NODE_COLLECTION),
        )}
      />,
    );

    const gains = container.querySelectorAll(".energy-overlay__gain");
    expect(gains).toHaveLength(1);
    expect(gains[0]).toHaveTextContent("+6");
    expect(gains[0]).toHaveClass("energy-overlay__gain--green");

    const pulses = container.querySelectorAll(".energy-overlay__pulse");
    expect(pulses).toHaveLength(3);
    for (const pulse of pulses) {
      expect(pulse).toHaveClass("energy-overlay__pulse--green");
    }
  });

  it("draws neither a gain nor a pulse when the action paid nothing", () => {
    const { container } = render(
      <EnergyOverlay
        session={sessionWithEvent(movedEventWithCollection(undefined))}
      />,
    );

    expect(container.querySelectorAll(".energy-overlay__gain")).toHaveLength(0);
    expect(container.querySelectorAll(".energy-overlay__pulse")).toHaveLength(
      0,
    );
  });

  it("draws both collections when a ply-ending action is followed by the other side's pass", () => {
    const passCollection: EnergyCollectedEffect = {
      type: "energy-collected",
      side: "red",
      amount: 1,
      newTotal: 4,
      squares: [squareAt("K", 5)],
    };
    const event: MovedEvent = {
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
          endOfTurn: [THREE_NODE_COLLECTION],
        },
        {
          type: "ply-passed",
          side: "red",
          sideToMove: "green",
          endOfTurn: [passCollection],
        },
      ],
      actionsRemaining: 1,
    };

    const { container } = render(
      <EnergyOverlay session={sessionWithEvent(event)} />,
    );

    const gains = container.querySelectorAll(".energy-overlay__gain");
    expect(gains).toHaveLength(2);
    expect(container.querySelectorAll(".energy-overlay__pulse")).toHaveLength(
      4,
    );
  });

  it("draws a top-level pass event's own collection", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      endOfTurn: [
        {
          type: "energy-collected",
          side: "red",
          amount: 3,
          newTotal: 3,
          squares: [squareAt("E", 5), squareAt("K", 5)],
        },
      ],
    };

    const { container } = render(
      <EnergyOverlay session={sessionWithEvent(event)} />,
    );

    expect(container.querySelectorAll(".energy-overlay__gain")).toHaveLength(1);
    expect(container.querySelectorAll(".energy-overlay__pulse")).toHaveLength(
      2,
    );
  });

  it("is aria-hidden", () => {
    const { container } = render(
      <EnergyOverlay
        session={sessionWithEvent(
          movedEventWithCollection(THREE_NODE_COLLECTION),
        )}
      />,
    );

    expect(container.querySelector(".energy-overlay")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(
      <EnergyOverlay
        session={sessionWithEvent(
          movedEventWithCollection(THREE_NODE_COLLECTION),
        )}
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
