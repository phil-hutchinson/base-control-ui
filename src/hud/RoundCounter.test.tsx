// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { startingGameState } from "../rules/gameState";
import { RoundCounter } from "./RoundCounter";

afterEach(cleanup);

function atPly(plyNumber: number, lengthInRounds?: number) {
  return {
    ...startingGameState(1, lengthInRounds),
    plyNumber,
  };
}

describe("RoundCounter", () => {
  it("reads 35/100 for a default-length game at ply 69", () => {
    const state = atPly(69);

    render(<RoundCounter state={state} />);

    expect(screen.getByText("35/100")).toBeInTheDocument();
    expect(screen.getByText("Round 35 of 100.")).toBeInTheDocument();
  });

  it("holds at 100/100 once the game is over, not 101/100", () => {
    const state = atPly(201);

    render(<RoundCounter state={state} />);

    expect(screen.getByText("100/100")).toBeInTheDocument();
  });

  it("reads against a shorter game's own length, not a hundred", () => {
    const state = atPly(3, 3);

    render(<RoundCounter state={state} />);

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("labels itself ROUND decoratively, leaving the spoken form as the only accessible text", () => {
    const state = atPly(69);

    render(<RoundCounter state={state} />);

    expect(screen.getByText("Round")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Round 35 of 100.")).toHaveClass("visually-hidden");
  });

  it("has no static accessibility violations", async () => {
    const state = atPly(1);

    const { container } = render(<RoundCounter state={state} />);

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
