import { useReducer } from "react";
import { Board } from "./board/Board";
import { TurnIndicator } from "./board/TurnIndicator";
import { reviewFixtureGameState } from "./game/reviewFixture";
import { createSession, sessionReducer } from "./game/session";
import "./App.css";

/** The starting session, built from the temporary review fixture. */
function createStartingSession() {
  return createSession(reviewFixtureGameState());
}

/** The app shell: the title and turn indicator above the board, drawn from the game session. */
export function App() {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createStartingSession,
  );

  return (
    <main className="app">
      <h1 className="app__title">Base Control</h1>
      <TurnIndicator state={session.state} />
      <div className="app__board">
        <Board session={session} onIntent={dispatch} />
      </div>
    </main>
  );
}
