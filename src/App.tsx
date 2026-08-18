import { useReducer } from "react";
import { Board } from "./board/Board";
import { createSession, sessionReducer } from "./game/session";
import { startingGameState } from "./rules/gameState";
import "./App.css";

/** The app shell: the title above the board, drawn from the game session. */
export function App() {
  const [session] = useReducer(
    sessionReducer,
    startingGameState(),
    createSession,
  );

  return (
    <main className="app">
      <h1 className="app__title">Base Control</h1>
      <div className="app__board">
        <Board session={session} />
      </div>
    </main>
  );
}
