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
  return screen.getAllByRole("gridcell", { name: /ship, power \d of 4$/ });
}

async function pressPlay() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Play" }));
}

describe("App", () => {
  it("opens on the start screen: the name, all three option groups at their defaults, and PLAY — no board, no HUD", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "30" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "None" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByText("Green to play")).not.toBeInTheDocument();
  });

  it("mounts exactly one hidden ship sprite, on the start screen and once a game is in progress", async () => {
    const { container } = render(<App />);

    const beforePlay = container.querySelectorAll(".ship-defs");
    expect(beforePlay).toHaveLength(1);
    expect(beforePlay[0]).toHaveAttribute("aria-hidden", "true");

    await pressPlay();

    const afterPlay = container.querySelectorAll(".ship-defs");
    expect(afterPlay).toHaveLength(1);
    expect(afterPlay[0]).toHaveAttribute("aria-hidden", "true");
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

  it("renders no in-game regions on the start screen", () => {
    const { container } = render(<App />);

    expect(container.querySelector(".app__screen")).not.toBeInTheDocument();
    expect(container.querySelector(".app__info")).not.toBeInTheDocument();
    expect(container.querySelector(".app__play")).not.toBeInTheDocument();
    expect(container.querySelector(".app__reserved")).not.toBeInTheDocument();
  });

  it("lays the in-game screen out as three regions, info, play, reserved, in that DOM order", async () => {
    // jsdom has no layout engine and applies no CSS, so this reaches for
    // class names via querySelector rather than role or text — a region
    // wrapper has no accessible role or name of its own to find it by, the
    // same reasoning as the `.board-square__mark--*` queries in
    // BoardSquare.test.tsx.
    const { container } = render(<App />);
    await pressPlay();

    const screenEl = container.querySelector(".app__screen");
    expect(screenEl).toBeInTheDocument();

    const regions = screenEl!.querySelectorAll(
      ":scope > .app__info, :scope > .app__play, :scope > .app__reserved",
    );
    expect(Array.from(regions).map((el) => el.className)).toEqual([
      "app__info",
      "app__play",
      "app__reserved",
    ]);

    const info = screenEl!.querySelector(".app__info")!;
    expect(info.querySelector("h1")?.textContent).toBe(GAME_NAME);
    expect(info.textContent).toContain("Green to play");

    const play = screenEl!.querySelector(".app__play")!;
    expect(play.querySelector('[role="grid"]')).toBeInTheDocument();

    const reserved = screenEl!.querySelector(".app__reserved")!;
    expect(reserved.textContent).toBe("RESERVED");
    expect(info.textContent).not.toContain("RESERVED");
    expect(play.textContent).not.toContain("RESERVED");
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

  it("pressing PLAY after choosing 5 ships deals a five-a-side game", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(shipCells()).toHaveLength(10);
  });

  it("pressing PLAY after choosing 45 rounds starts a game of that length", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "45" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(screen.getByText("1/45")).toBeInTheDocument();
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

  function assertNoDuplicateIds(container: HTMLElement) {
    const ids = Array.from(container.querySelectorAll("[id]")).map(
      (element) => element.id,
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  }

  it("never repeats an id in the rendered document, on the start screen", () => {
    const { container } = render(<App />);

    assertNoDuplicateIds(container);
  });

  it("never repeats an id in the rendered document, with a full fourteen-ship board on screen", async () => {
    const { container } = render(<App />);

    await pressPlay();

    expect(shipCells()).toHaveLength(14);

    assertNoDuplicateIds(container);
  });
});
