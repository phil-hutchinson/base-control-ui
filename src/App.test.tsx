// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { GAME_NAME } from "./gameName";

// Vitest's globals are off (see vite.config.ts), so Testing Library's
// automatic afterEach cleanup never registers itself; without this, each
// test's render stays mounted and pollutes the next.
afterEach(cleanup);

/** The ships on the board, one gridcell per ship, by their accessible name. */
function shipCells() {
  return screen.getAllByRole("gridcell", { name: /ship, \d+ shields?$/ });
}

async function pressPlay() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Play" }));
}

describe("App", () => {
  it("opens on the start screen: the name, both option groups at their defaults, and PLAY — no board, no HUD", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "30" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByText("Green to play")).not.toBeInTheDocument();
  });

  it("has no static accessibility violations on the start screen", async () => {
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: {
        // jsdom has no layout or canvas, so this rule cannot produce a
        // meaningful result here and instead prints a spurious
        // getContext-not-implemented error to stderr.
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("pressing PLAY with the defaults deals a seven-a-side, thirty-round game", async () => {
    render(<App />);

    await pressPlay();

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByText("Green to play")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Green: 0 energy, no nodes held, standing on no dormant sites.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Red: 0 energy, no nodes held, standing on no dormant sites.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1/30")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(shipCells()).toHaveLength(14);
  });

  it("pressing PLAY after choosing 5 ships deals the five-a-side layout", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(shipCells()).toHaveLength(10);
  });

  it("has no static accessibility violations once a game is in progress", async () => {
    const { container } = render(<App />);

    await pressPlay();

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
