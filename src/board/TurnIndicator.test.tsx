// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { startingGameState } from "../rules/gameState";
import { TurnIndicator } from "./TurnIndicator";

afterEach(cleanup);

describe("TurnIndicator", () => {
  it("says green's turn with two actions left", () => {
    const state = { ...startingGameState(1), sideToMove: "green" as const };

    render(<TurnIndicator state={state} />);

    expect(
      screen.getByText("Green's turn — 2 actions left"),
    ).toBeInTheDocument();
  });

  it("says green's turn with one action left, singular", () => {
    const state = {
      ...startingGameState(1),
      sideToMove: "green" as const,
      actionsRemaining: 1,
    };

    render(<TurnIndicator state={state} />);

    expect(
      screen.getByText("Green's turn — 1 action left"),
    ).toBeInTheDocument();
  });

  it("says red's turn with two actions left", () => {
    const state = {
      ...startingGameState(1),
      sideToMove: "red" as const,
      actionsRemaining: 2,
    };

    render(<TurnIndicator state={state} />);

    expect(screen.getByText("Red's turn — 2 actions left")).toBeInTheDocument();
  });

  it("is not a live region", () => {
    const state = startingGameState(1);

    const { container } = render(<TurnIndicator state={state} />);

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});
