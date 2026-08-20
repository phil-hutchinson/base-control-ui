// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "../board/Board";
import { squareAt, squareName } from "../rules/board";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import { STARTING_FLEET } from "../rules/fleet";
import { isGameOver } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";
import { freshSeed } from "../game/seed";
import { createSession, sessionReducer } from "../game/session";
import { GameOverPanel } from "./GameOverPanel";
import { Hud } from "./Hud";

afterEach(cleanup);

/** A finished game: `plyNumber` already past its own `lengthInRounds`. */
function finishedState(overrides: Partial<GameState> = {}): GameState {
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
    ...overrides,
  };
}

describe("GameOverPanel", () => {
  it("names the winner and shows both final totals", () => {
    const { container } = render(
      <GameOverPanel state={finishedState()} onPlayAgain={() => {}} />,
    );

    expect(screen.getByText("Red wins, 7 energy to 4.")).toBeInTheDocument();
    expect(
      container.querySelector(
        ".game-over-panel__score--green .game-over-panel__score-digits",
      ),
    ).toHaveTextContent("4");
    expect(
      container.querySelector(
        ".game-over-panel__score--red .game-over-panel__score-digits",
      ),
    ).toHaveTextContent("7");
  });

  it("keeps the result sentence out of the panel's visible layout, while it stays findable as accessible text", () => {
    render(<GameOverPanel state={finishedState()} onPlayAgain={() => {}} />);

    const resultSentence = screen.getByText("Red wins, 7 energy to 4.");
    expect(resultSentence).toHaveClass("visually-hidden");
    expect(resultSentence).not.toHaveClass("game-over-panel__result");
  });

  it("names a draw", () => {
    render(
      <GameOverPanel
        state={finishedState({ energy: { green: 5, red: 5 } })}
        onPlayAgain={() => {}}
      />,
    );

    expect(
      screen.getByText("The game is a draw, 5 energy each."),
    ).toBeInTheDocument();
  });

  it("is a labelled dialog, focused when it appears", () => {
    render(<GameOverPanel state={finishedState()} onPlayAgain={() => {}} />);

    const dialog = screen.getByRole("dialog", { name: "Game over" });
    expect(dialog).toHaveFocus();
  });

  it("the play-again button is reachable and operable by keyboard", async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    render(<GameOverPanel state={finishedState()} onPlayAgain={onPlayAgain} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Play again" })).toHaveFocus();

    await user.keyboard("[Enter]");
    expect(onPlayAgain).toHaveBeenCalledTimes(1);

    await user.keyboard("[Space]");
    expect(onPlayAgain).toHaveBeenCalledTimes(2);
  });

  it("calls onPlayAgain when the button is clicked", async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    render(<GameOverPanel state={finishedState()} onPlayAgain={onPlayAgain} />);

    await user.click(screen.getByRole("button", { name: "Play again" }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(
      <GameOverPanel state={finishedState()} onPlayAgain={() => {}} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  describe("wired into the board, as App.tsx wires it", () => {
    // A stand-in for App.tsx's own useReducer wiring and its play-again
    // handler, parameterized by a starting state, so these tests exercise
    // the real session reducer end to end rather than a hand-built session.
    function Harness({ initial }: { initial: GameState }) {
      const [session, dispatch] = useReducer(
        sessionReducer,
        initial,
        createSession,
      );

      function handlePlayAgain() {
        dispatch({
          type: "new-game",
          randomSeed: freshSeed(),
          lengthInRounds: session.state.lengthInRounds,
        });
      }

      return (
        <>
          <Hud state={session.state} />
          <Board session={session} onIntent={dispatch} />
          {isGameOver(session.state) && (
            <GameOverPanel
              state={session.state}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </>
      );
    }

    // One action from the end of a one-round game: red's own last action,
    // moving red-1 from H8 to the empty H9 next to it.
    function nearEndState(): GameState {
      return {
        ships: [
          { id: "red-1", side: "red", square: squareAt("H", 8), shields: 0 },
        ],
        siteStates: {},
        sideToMove: "red",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber: 2,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 4, red: 7 },
        lengthInRounds: 1,
      };
    }

    function liveRegion(): HTMLElement {
      return screen.getByRole("status");
    }

    it("is absent while the game is in progress, appears once the last action ends it, and the live region announces the result", async () => {
      const user = userEvent.setup();
      render(<Harness initial={nearEndState()} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(screen.getByRole("gridcell", { name: /^H8,/ }));
      await user.click(
        screen.getByRole("gridcell", { name: /^H9,.*can move here$/ }),
      );

      expect(
        screen.getByRole("dialog", { name: "Game over" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Red wins, 7 energy to 4.")).toBeInTheDocument();
      expect(liveRegion()).toHaveTextContent(
        "The game is over after 1 round. Red wins, 7 energy to 4.",
      );
    });

    it("play again starts a fresh game of the same length: ply 1, both scores 0, the panel gone, the board accepting clicks again", async () => {
      const user = userEvent.setup();
      render(<Harness initial={nearEndState()} />);

      await user.click(screen.getByRole("gridcell", { name: /^H8,/ }));
      await user.click(
        screen.getByRole("gridcell", { name: /^H9,.*can move here$/ }),
      );
      await user.click(screen.getByRole("button", { name: "Play again" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("1/1")).toBeInTheDocument();
      expect(
        screen.getByText("Green: 0 energy, no nodes held."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Red: 0 energy, no nodes held."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Green's turn — 1 action left"),
      ).toBeInTheDocument();

      const greenStart = STARTING_FLEET[0];
      await user.click(
        screen.getByRole("gridcell", {
          name: new RegExp(`^${squareName(greenStart.square)},`),
        }),
      );

      expect(liveRegion()).toHaveTextContent(/selected/);
    });
  });
});
