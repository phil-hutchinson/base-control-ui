// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { startingGameState } from "../rules/gameState";
import { Hud } from "./Hud";

afterEach(cleanup);

describe("Hud", () => {
  it("renders both scores, the round counter and the turn indicator", () => {
    const state = {
      ...startingGameState(1, 100),
      energy: { green: 24, red: 9 },
      plyNumber: 69,
    };

    render(<Hud state={state} displayedEnergy={state.energy} />);

    expect(
      screen.getByText(
        "Green: 24 energy, no nodes held, standing on no depleted nodes.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Red: 9 energy, no nodes held, standing on no depleted nodes.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("35/100")).toBeInTheDocument();
    expect(screen.getByText("Green to play")).toBeInTheDocument();
  });

  it("reads a shorter game's own length in the round counter", () => {
    const state = { ...startingGameState(1, 3), plyNumber: 3 };

    render(<Hud state={state} displayedEnergy={state.energy} />);

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("has no static accessibility violations", async () => {
    const state = startingGameState(1);

    const { container } = render(
      <Hud state={state} displayedEnergy={state.energy} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
