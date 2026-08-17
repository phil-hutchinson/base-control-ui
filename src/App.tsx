import { Board } from "./board/Board";
import "./App.css";

/** The app shell: the title above the board in its starting position. */
export function App() {
  return (
    <main className="app">
      <h1 className="app__title">Base Control</h1>
      <div className="app__board">
        <Board />
      </div>
    </main>
  );
}
