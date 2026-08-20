import { useReducer } from "react";
import { Board } from "./board/Board";
import { freshSeed } from "./game/seed";
import { createSession, sessionReducer } from "./game/session";
import { reviewFixtureGameState } from "./game/reviewFixture";
import { GameOverPanel } from "./hud/GameOverPanel";
import { Hud } from "./hud/Hud";
import { isGameOver } from "./rules/gameLength";
import "./App.css";

/** The starting session, built from the temporary review fixture. */
function createStartingSession() {
  return createSession(reviewFixtureGameState());
}

/** The app shell: the title and HUD above the board, drawn from the game session. */
export function App() {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createStartingSession,
  );

  /** Play again: a fresh seed, the finished game's own length, nothing else. */
  function handlePlayAgain() {
    dispatch({
      type: "new-game",
      randomSeed: freshSeed(),
      lengthInRounds: session.state.lengthInRounds,
    });
  }

  return (
    <main className="app">
      <div className="app__cabinet">
        <h1 className="app__title">Base Control</h1>
        <Hud state={session.state} />
        <div className="app__board">
          <Board session={session} onIntent={dispatch} />
        </div>
        {isGameOver(session.state) && (
          <GameOverPanel state={session.state} onPlayAgain={handlePlayAgain} />
        )}
      </div>
    </main>
  );
}
