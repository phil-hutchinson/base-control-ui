// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "../board/Board";
import { squareAt, squareName } from "../rules/board";
import { STARTING_FLEET } from "../rules/fleet";
import { isGameOver } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";
import { freshSeed } from "../game/seed";
import { createSession, sessionReducer } from "../game/session";
import { GameOverPanel } from "./GameOverPanel";
import { Hud } from "./Hud";
import { useDisplayedEnergy } from "./useDisplayedEnergy";

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
    // Mirrors App.tsx: the panel takes the place of the HUD and board once
    // the game is over and the score roll has settled, rather than covering
    // them.
    function Harness({ initial }: { initial: GameState }) {
      const [session, dispatch] = useReducer(
        sessionReducer,
        initial,
        createSession,
      );
      const { displayed: displayedEnergy, settled } = useDisplayedEnergy(
        session.state.energy,
      );

      function handlePlayAgain() {
        dispatch({
          type: "new-game",
          randomSeed: freshSeed(),
          lengthInRounds: session.state.lengthInRounds,
        });
      }

      const gameOver = isGameOver(session.state) && settled;

      return gameOver ? (
        <GameOverPanel state={session.state} onPlayAgain={handlePlayAgain} />
      ) : (
        <>
          <Hud state={session.state} displayedEnergy={displayedEnergy} />
          <Board session={session} onIntent={dispatch} />
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
        energy: { green: 4, red: 7 },
        lengthInRounds: 1,
      };
    }

    function liveRegion(): HTMLElement {
      return screen.getByRole("status");
    }

    // One action from the end of a one-round game in which that last action
    // scores: red-1 already stands on a charged node and does not move;
    // red-2's move is the ending action, so its own end-of-turn collects the
    // node red-1 holds and the HUD's score rolls before the panel appears.
    function scoringNearEndState(): GameState {
      return {
        ships: [
          { id: "red-1", side: "red", square: squareAt("H", 8), shields: 0 },
          { id: "red-2", side: "red", square: squareAt("G", 1), shields: 0 },
        ],
        siteStates: {
          [squareName(squareAt("H", 8))]: {
            state: "charged",
            level: 1,
          },
        },
        sideToMove: "red",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber: 2,
        randomSeed: 1,
        energy: { green: 4, red: 6 },
        lengthInRounds: 1,
      };
    }

    it("is absent while the game is in progress, and appears once the last action ends it", async () => {
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
    });

    it("holds the panel back while the last turn's score rolls, keeping the board and HUD on screen and the live region announcing the result, then shows the settled total once it appears", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness initial={scoringNearEndState()} />);

      await user.click(screen.getByRole("gridcell", { name: /^G1,/ }));
      await user.click(
        screen.getByRole("gridcell", { name: /^G2,.*can move here$/ }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(liveRegion()).toHaveTextContent(
        "The game is over after 1 round. Red wins, 7 energy to 4.",
      );

      expect(
        await screen.findByRole(
          "dialog",
          { name: "Game over" },
          { timeout: 2000 },
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Red wins, 7 energy to 4.")).toBeInTheDocument();
      expect(
        container.querySelector(
          ".game-over-panel__score--red .game-over-panel__score-digits",
        ),
      ).toHaveTextContent("7");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Red: 7 energy, 1 node held, standing on no dormant sites.",
        ),
      ).not.toBeInTheDocument();
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
        screen.getByText(
          "Green: 0 energy, no nodes held, standing on no dormant sites.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Red: 0 energy, no nodes held, standing on no dormant sites.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Green to play")).toBeInTheDocument();

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
