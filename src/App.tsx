import { useReducer } from "react";
import { Board } from "./board/Board";
import { freshSeed } from "./game/seed";
import { createSession, sessionReducer } from "./game/session";
import { GAME_NAME } from "./gameName";
import { GameOverPanel } from "./hud/GameOverPanel";
import { Hud } from "./hud/Hud";
import { useDisplayedEnergy } from "./hud/useDisplayedEnergy";
import { isFleetSize } from "./rules/fleet";
import { isGameOver } from "./rules/gameLength";
import { type GameState, startingGameState } from "./rules/gameState";
import "./App.css";

/** The starting session, built from the real starting position with a fresh seed. */
function createStartingSession() {
  return createSession(startingGameState(freshSeed()));
}

/**
 * A game's fleet size, as the count of one side's ships in its state.
 * Fleet size is never stored on `GameState` itself.
 */
function fleetSizeOf(state: GameState) {
  const count = state.ships.filter((ship) => ship.side === "green").length;
  if (!isFleetSize(count)) {
    throw new RangeError(`unexpected fleet size ${count}`);
  }
  return count;
}

/**
 * The app shell: one cabinet box holding the title, the HUD and the board,
 * drawn from the game session, swapped in full for the game-over panel once
 * the game has ended and the last turn's score roll has settled.
 */
export function App() {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createStartingSession,
  );
  const { displayed: displayedEnergy, settled } = useDisplayedEnergy(
    session.state.energy,
  );

  /** Play again: a fresh seed, the finished game's own length, nothing else. */
  function handlePlayAgain() {
    dispatch({
      type: "new-game",
      randomSeed: freshSeed(),
      lengthInRounds: session.state.lengthInRounds,
      fleetSize: fleetSizeOf(session.state),
    });
  }

  // The panel takes over the whole cabinet once the game has ended and the
  // last turn's score roll has settled — until then the game stays on
  // screen and the HUD keeps counting up.
  const gameOver = isGameOver(session.state) && settled;

  return (
    <main className="app">
      <div className="app__cabinet">
        {gameOver ? (
          <GameOverPanel state={session.state} onPlayAgain={handlePlayAgain} />
        ) : (
          <>
            <h1 className="app__title">{GAME_NAME}</h1>
            <Hud state={session.state} displayedEnergy={displayedEnergy} />
            <div className="app__board">
              <Board session={session} onIntent={dispatch} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
