// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import { startingGameState, type GameState } from "../rules/gameState";
import { TurnIndicator } from "./TurnIndicator";

afterEach(cleanup);

/** A finished game: `plyNumber` already past its own `lengthInRounds`. */
function finishedState(): GameState {
  return {
    ships: [],
    siteStates: {},
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 3,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    energy: { green: 4, red: 7 },
    lengthInRounds: 1,
  };
}

describe("TurnIndicator", () => {
  it("says green to play, with the green side modifier", () => {
    const state = { ...startingGameState(1), sideToMove: "green" as const };

    render(<TurnIndicator state={state} />);

    const indicator = screen.getByText("Green to play");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("turn-indicator--green");
  });

  it("says red to play, with the red side modifier", () => {
    const state = { ...startingGameState(1), sideToMove: "red" as const };

    render(<TurnIndicator state={state} />);

    const indicator = screen.getByText("Red to play");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("turn-indicator--red");
  });

  it("reads 'Game over' once the game has ended, instead of naming a side", () => {
    render(<TurnIndicator state={finishedState()} />);

    const indicator = screen.getByText("Game over");
    expect(indicator).toBeInTheDocument();
    expect(indicator).not.toHaveClass("turn-indicator--green");
    expect(indicator).not.toHaveClass("turn-indicator--red");
  });

  it("is not a live region", () => {
    const state = startingGameState(1);

    const { container } = render(<TurnIndicator state={state} />);

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});
