// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { Board } from "./board/Board";
import { GAME_NAME } from "./gameName";
import { LEAVE_GAME_PROMPT } from "./nav/screenAddress";

// Vitest's globals are off (see vite.config.ts), so Testing Library's
// automatic afterEach cleanup never registers itself; without this, each
// test's render stays mounted and pollutes the next.
afterEach(cleanup);

// jsdom keeps one location for the whole file; without this, a test that
// left a fragment behind (opening the guide, say) would decide which screen
// the next test mounts on.
function resetAddress() {
  window.history.replaceState(null, "", "/");
}

beforeEach(resetAddress);
afterEach(resetAddress);

// A Back or Forward press, without waiting on the browser: moves the address
// and dispatches the event a real traversal would fire. `history.back()` is
// asynchronous, so tests that are not about
// history's own shape use this instead, matching `useScreenAddress.test.tsx`.
function traverseTo(hash: string) {
  act(() => {
    window.history.replaceState(null, "", `/${hash}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

// jsdom does not implement window.confirm; this stubs it for the one test
// file where the abandon guard is actually crossed by a whole app. Restored
// after every test so a call count from one test can never leak into the
// next, and so the confirm stub never outlives the render it belongs to.
function spyOnConfirm() {
  return vi.spyOn(window, "confirm");
}

let confirmSpy: ReturnType<typeof spyOnConfirm> | undefined;

function stubConfirm(answer: boolean) {
  confirmSpy = spyOnConfirm().mockReturnValue(answer);
  return confirmSpy;
}

afterEach(() => {
  confirmSpy?.mockRestore();
  confirmSpy = undefined;
});

/** Dispatches a cancelable `beforeunload` and reports whether it was cancelled. */
function dispatchBeforeUnload() {
  return window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
}

// Wraps the real Board in a spy, forwarding every call to the actual
// implementation, so a single test, below, can count its renders without
// changing what it renders for every other test in this file.
vi.mock("./board/Board", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./board/Board")>();
  return { ...actual, Board: vi.fn(actual.Board) };
});

/** The ships on the board, one gridcell per ship, by their accessible name. */
function shipCells() {
  return screen.getAllByRole("gridcell", { name: /ship, power \d of 6$/ });
}

/**
 * The start screen's option groups. Every radio query goes through one of
 * these: with Ships offering 6, 5, 4, 3 and Charged nodes offering 5, 4, 3,
 * a value alone no longer names a radio uniquely.
 */
function roundsGroup() {
  return screen.getByRole("group", { name: "Rounds" });
}

function combatGroup() {
  return screen.getByRole("group", { name: "Combat" });
}

function scoringGroup() {
  return screen.getByRole("group", { name: "Scoring" });
}

function nodeRotationGroup() {
  return screen.getByRole("group", { name: "Inactive node rotation" });
}

function planetBonusGroup() {
  return screen.getByRole("group", { name: "Planet bonus" });
}

function clockGroup() {
  return screen.getByRole("group", { name: "Clock (time per move)" });
}

async function pressPlay() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Play" }));
}

describe("App", () => {
  it("opens on the start screen: the name, all eight option groups at their defaults, and PLAY — no board, no HUD", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Ships" })).getByRole("radio", {
        name: "6",
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole("group", { name: "Charged nodes" })).getByRole(
        "radio",
        { name: "5" },
      ),
    ).toBeChecked();
    expect(
      within(scoringGroup()).getByRole("radio", { name: "SIMPLE" }),
    ).toBeChecked();
    expect(
      within(planetBonusGroup()).getByRole("radio", { name: "OFF" }),
    ).toBeChecked();
    expect(
      within(nodeRotationGroup()).getByRole("radio", { name: "CONTINUOUS" }),
    ).toBeChecked();
    expect(
      within(combatGroup()).getByRole("radio", { name: "OFF" }),
    ).toBeChecked();
    expect(
      within(screen.getByRole("group", { name: "Rounds" })).getByRole("radio", {
        name: "30",
      }),
    ).toBeChecked();
    expect(
      within(clockGroup()).getByRole("radio", { name: "UNLIMITED" }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByText("Green to play")).not.toBeInTheDocument();
  });

  it("renders the eight option groups in order: Ships, Charged nodes, Scoring, Planet bonus, Inactive node rotation, Combat, Rounds, Clock", () => {
    render(<App />);

    const groups = screen.getAllByRole("group");
    expect(
      groups.map((group) => group.querySelector("legend")?.textContent ?? ""),
    ).toEqual([
      "Ships",
      "Charged nodes",
      "Scoring",
      "Planet bonus",
      "Inactive node rotation",
      "Combat",
      "Rounds",
      "Clock (time per move)",
    ]);
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

  it("mounts exactly one hidden planet sprite, on the start screen, the guide screen and once a game is in progress", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const onStart = container.querySelectorAll(".planet-defs");
    expect(onStart).toHaveLength(1);
    expect(onStart[0]).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button", { name: "Quick Guide" }));

    const onGuide = container.querySelectorAll(".planet-defs");
    expect(onGuide).toHaveLength(1);
    expect(onGuide[0]).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getAllByRole("button", { name: "Back" })[0]);
    await pressPlay();

    const inGame = container.querySelectorAll(".planet-defs");
    expect(inGame).toHaveLength(1);
    expect(inGame[0]).toHaveAttribute("aria-hidden", "true");
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
    expect(container.querySelector(".app__clocks")).not.toBeInTheDocument();
  });

  it("lays the in-game screen out as three regions, info, play, clocks, in that DOM order", async () => {
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
      ":scope > .app__info, :scope > .app__play, :scope > .app__clocks",
    );
    expect(Array.from(regions).map((el) => el.className)).toEqual([
      "app__info",
      "app__play",
      "app__clocks",
    ]);

    const info = screenEl!.querySelector(".app__info")!;
    expect(info.querySelector("h1")?.textContent).toBe(GAME_NAME);
    expect(info.textContent).toContain("Green to play");

    const play = screenEl!.querySelector(".app__play")!;
    expect(play.querySelector('[role="grid"]')).toBeInTheDocument();

    // With no clock chosen (the default), both readings say INF.
    const clocks = screenEl!.querySelector(".app__clocks")!;
    expect(clocks.textContent).toContain("Green");
    expect(clocks.textContent).toContain("Red");
    expect(clocks.querySelectorAll(".clock-display__reading")).toHaveLength(2);
    for (const reading of clocks.querySelectorAll(".clock-display__reading")) {
      expect(reading.textContent).toBe("INF");
    }
  });

  it("pressing PLAY with the defaults deals a six-a-side, thirty-round game", async () => {
    render(<App />);

    await pressPlay();

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByText("Green to play")).toBeInTheDocument();
    expect(
      screen.getByText("Green: 0 energy, no nodes held."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Red: 0 energy, no nodes held."),
    ).toBeInTheDocument();
    expect(screen.getByText("1/30")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(shipCells()).toHaveLength(12);
  });

  it("pressing PLAY with the defaults starts a game whose pips pay the simple rate", async () => {
    const { container } = render(<App />);

    await pressPlay();

    const greenCell = container.querySelector(".score-display--green");
    const numbers = Array.from(
      greenCell?.querySelectorAll(".score-display__pip-value") ?? [],
    ).map((node) => node.textContent);
    expect(numbers).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("choosing BONUS before PLAY starts a game whose pips pay the bonus rate", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(
      within(scoringGroup()).getByRole("radio", { name: "BONUS" }),
    );
    await user.click(screen.getByRole("button", { name: "Play" }));

    const greenCell = container.querySelector(".score-display--green");
    const numbers = Array.from(
      greenCell?.querySelectorAll(".score-display__pip-value") ?? [],
    ).map((node) => node.textContent);
    expect(numbers).toEqual(["1", "3", "6", "10", "15"]);
  });

  it("pressing PLAY after choosing 5 ships deals a five-a-side game", async () => {
    const user = userEvent.setup();
    render(<App />);

    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    await user.click(within(shipsGroup).getByRole("radio", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(shipCells()).toHaveLength(10);
  });

  it("pressing PLAY after choosing 3 ships deals a three-a-side game", async () => {
    const user = userEvent.setup();
    render(<App />);

    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    await user.click(within(shipsGroup).getByRole("radio", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(shipCells()).toHaveLength(6);
  });

  it("pressing PLAY after choosing 4 ships deals a four-a-side game", async () => {
    const user = userEvent.setup();
    render(<App />);

    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    await user.click(within(shipsGroup).getByRole("radio", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(shipCells()).toHaveLength(8);
  });

  it("pressing PLAY after choosing 4 charged nodes shows a four-charged board", async () => {
    const user = userEvent.setup();
    render(<App />);

    const chargedNodesGroup = screen.getByRole("group", {
      name: "Charged nodes",
    });
    await user.click(
      within(chargedNodesGroup).getByRole("radio", { name: "4" }),
    );
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(
      screen.getAllByRole("gridcell", { name: /, charged node/ }),
    ).toHaveLength(4);
  });

  it("pressing PLAY after choosing 3 charged nodes shows a three-charged board", async () => {
    const user = userEvent.setup();
    render(<App />);

    const chargedNodesGroup = screen.getByRole("group", {
      name: "Charged nodes",
    });
    await user.click(
      within(chargedNodesGroup).getByRole("radio", { name: "3" }),
    );
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(
      screen.getAllByRole("gridcell", { name: /, charged node/ }),
    ).toHaveLength(3);
  });

  it("pressing PLAY after choosing 45 rounds starts a game of that length", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(roundsGroup()).getByRole("radio", { name: "45" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(screen.getByText("1/45")).toBeInTheDocument();
  });

  it("pressing PLAY with the default OFF starts a game in which selecting green's L1 ship marks no square as a target", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Play" }));
    await user.click(screen.getByRole("gridcell", { name: /^L1,/ }));

    expect(
      screen.queryByRole("gridcell", { name: /can attack here/ }),
    ).not.toBeInTheDocument();
  });

  it("choosing ON before PLAY starts a game in which selecting green's L1 ship marks red's O2 as a target", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(combatGroup()).getByRole("radio", { name: "ON" }));
    await user.click(screen.getByRole("button", { name: "Play" }));
    await user.click(screen.getByRole("gridcell", { name: /^L1,/ }));

    expect(
      screen.getByRole("gridcell", {
        name: "O2, red ship, power 6 of 6, can attack here, costs 3 power, both ships would return to planets",
      }),
    ).toBeInTheDocument();
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

  it("never repeats an id in the rendered document, with a full twelve-ship board on screen", async () => {
    const { container } = render(<App />);

    await pressPlay();

    expect(shipCells()).toHaveLength(12);

    assertNoDuplicateIds(container);
  });

  it("never repeats an id in the rendered document, on the guide screen", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Quick Guide" }));

    assertNoDuplicateIds(container);
  });

  it("opens the guide from Quick Guide, and returns to the start screen with the chosen options untouched, without ever starting a game", async () => {
    const user = userEvent.setup();
    render(<App />);
    const renderCountBefore = vi.mocked(Board).mock.calls.length;

    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    await user.click(within(shipsGroup).getByRole("radio", { name: "5" }));
    await user.click(within(roundsGroup()).getByRole("radio", { name: "45" }));
    await user.click(within(combatGroup()).getByRole("radio", { name: "ON" }));
    await user.click(
      within(scoringGroup()).getByRole("radio", { name: "BONUS" }),
    );
    await user.click(
      within(nodeRotationGroup()).getByRole("radio", { name: "DEDICATED" }),
    );
    await user.click(screen.getByRole("button", { name: "Quick Guide" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "QUICK GUIDE" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(vi.mocked(Board).mock.calls.length).toBe(renderCountBefore);

    await user.click(screen.getAllByRole("button", { name: "Back" })[0]);

    // The guide's own Back button is the browser's Back (`useScreenAddress`),
    // and `history.back()` resolves asynchronously.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: GAME_NAME }),
      ).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("group", { name: "Ships" })).getByRole("radio", {
        name: "5",
      }),
    ).toBeChecked();
    expect(
      within(roundsGroup()).getByRole("radio", { name: "45" }),
    ).toBeChecked();
    expect(
      within(combatGroup()).getByRole("radio", { name: "ON" }),
    ).toBeChecked();
    expect(
      within(scoringGroup()).getByRole("radio", { name: "BONUS" }),
    ).toBeChecked();
    expect(
      within(nodeRotationGroup()).getByRole("radio", { name: "DEDICATED" }),
    ).toBeChecked();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(vi.mocked(Board).mock.calls.length).toBe(renderCountBefore);
  });

  it("choosing DEDICATED before PLAY starts a game, and returning to start still shows it chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    stubConfirm(true);

    await user.click(
      within(nodeRotationGroup()).getByRole("radio", { name: "DEDICATED" }),
    );
    await pressPlay();

    expect(screen.getByRole("grid")).toBeInTheDocument();

    traverseTo("");

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(
      within(nodeRotationGroup()).getByRole("radio", { name: "DEDICATED" }),
    ).toBeChecked();
  });

  it("choosing 3 POINTS before PLAY starts a game, and returning to start still shows it chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    stubConfirm(true);

    await user.click(
      within(planetBonusGroup()).getByRole("radio", { name: "3 POINTS" }),
    );
    await pressPlay();

    expect(screen.getByRole("grid")).toBeInTheDocument();

    traverseTo("");

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(
      within(planetBonusGroup()).getByRole("radio", { name: "3 POINTS" }),
    ).toBeChecked();
  });

  it("does not repaint the board on a clock tick", async () => {
    // `shouldAdvanceTime` lets user-event's own internal scheduling (pointer
    // events, focus handling) keep resolving in the background while the
    // fake clock is otherwise driven explicitly below — without it, the
    // clicks below never settle.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      await user.click(within(clockGroup()).getByRole("radio", { name: "6s" }));
      await user.click(screen.getByRole("button", { name: "Play" }));

      expect(screen.getAllByText("3:00").length).toBeGreaterThan(0);
      const renderCountBefore = vi.mocked(Board).mock.calls.length;

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getAllByText("2:59").length).toBeGreaterThan(0);
      expect(vi.mocked(Board).mock.calls.length).toBe(renderCountBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it("addresses a game in progress at #game", async () => {
    render(<App />);

    await pressPlay();

    expect(window.location.hash).toBe("#game");
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("addresses the quick guide, and browser Back and Forward move between it and the menu", async () => {
    const user = userEvent.setup();
    render(<App />);

    // A non-default choice, so that finding it still set after the traversal
    // says the options survived rather than that they were reset to these.
    await user.click(
      within(screen.getByRole("group", { name: "Ships" })).getByRole("radio", {
        name: "4",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Quick Guide" }));
    expect(window.location.hash).toBe("#how-to-play");

    traverseTo("");

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Ships" })).getByRole("radio", {
        name: "4",
      }),
    ).toBeChecked();

    traverseTo("#how-to-play");

    expect(
      screen.getByRole("heading", { level: 1, name: "QUICK GUIDE" }),
    ).toBeInTheDocument();
  });

  it("opens the guide when the page loads at #how-to-play", () => {
    window.history.replaceState(null, "", "/#how-to-play");
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "QUICK GUIDE" }),
    ).toBeInTheDocument();
  });

  it("shows the menu, and corrects the address, on a cold load of #game", async () => {
    const confirm = stubConfirm(true);
    window.history.replaceState(null, "", "/#game");
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    // Neither prompt: there was never a game here to leave.
    expect(confirm).not.toHaveBeenCalled();
    expect(dispatchBeforeUnload()).toBe(true);
  });

  it("prompts before Back leaves a game in progress, and cancelling leaves it on the same turn with the clock where it was", async () => {
    // `shouldAdvanceTime` lets user-event's own scheduling keep resolving
    // while the fake clock is otherwise driven explicitly below, the same
    // pattern the file's other clock test uses.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ delay: null });
      render(<App />);

      await user.click(within(clockGroup()).getByRole("radio", { name: "6s" }));
      await user.click(screen.getByRole("button", { name: "Play" }));

      expect(screen.getAllByText("3:00").length).toBeGreaterThan(0);

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getAllByText("2:57").length).toBeGreaterThan(0);

      const confirm = stubConfirm(false);
      traverseTo("");

      expect(confirm).toHaveBeenCalledWith(LEAVE_GAME_PROMPT);
      expect(screen.getByText("Green to play")).toBeInTheDocument();
      expect(screen.getByText("1/30")).toBeInTheDocument();
      expect(window.location.hash).toBe("#game");
      // The reading proves the game screen never unmounted: `useGameClock`
      // keeps spent time in refs, so an unmount would silently reset it to
      // the full budget instead of leaving it advanced.
      expect(screen.getAllByText("2:57").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("abandons the game once Back is confirmed, and Forward does not resume it or ask again", async () => {
    render(<App />);
    const confirm = stubConfirm(true);

    await pressPlay();
    traverseTo("");

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();

    traverseTo("#game");

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("cancels the tab's close/reload while a game is in progress, and not on the menu or the guide", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(dispatchBeforeUnload()).toBe(true);

    await user.click(screen.getByRole("button", { name: "Quick Guide" }));
    expect(dispatchBeforeUnload()).toBe(true);

    await user.click(screen.getAllByRole("button", { name: "Back" })[0]);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: GAME_NAME }),
      ).toBeInTheDocument();
    });

    await pressPlay();
    expect(dispatchBeforeUnload()).toBe(false);
  });
});
