import { useReducer, useState } from "react";
import { Board } from "./board/Board";
import { freshSeed } from "./game/seed";
import { createSession, sessionReducer } from "./game/session";
import { GAME_NAME } from "./gameName";
import { GameOverPanel } from "./hud/GameOverPanel";
import { Hud } from "./hud/Hud";
import { useDisplayedEnergy } from "./hud/useDisplayedEnergy";
import { DEFAULT_FLEET_SIZE, type FleetSize } from "./rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS, isGameOver } from "./rules/gameLength";
import { startingGameState } from "./rules/gameState";
import { StartScreen } from "./start/StartScreen";
import "./App.css";

/**
 * The session reducer's initial value: a real starting position, built at
 * mount from a fresh seed, but never shown — the app opens on the start
 * screen and this is replaced by the first PLAY press.
 */
function createStartingSession() {
  return createSession(startingGameState(freshSeed()));
}

/**
 * The app shell: the start screen until PLAY is pressed, then one cabinet
 * box holding the title, the HUD and the board, drawn from the game
 * session, swapped in full for the game-over panel once the game has ended
 * and the last turn's score roll has settled.
 */
export function App() {
  const [screen, setScreen] = useState<"start" | "game">("start");
  const [fleetSize, setFleetSize] = useState<FleetSize>(DEFAULT_FLEET_SIZE);
  const [lengthInRounds, setLengthInRounds] = useState(
    DEFAULT_GAME_LENGTH_ROUNDS,
  );
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createStartingSession,
  );
  const { displayed: displayedEnergy, settled } = useDisplayedEnergy(
    session.state.energy,
  );

  /** PLAY: a fresh seed, the chosen length and fleet size, then the game screen. */
  function handlePlay() {
    dispatch({
      type: "new-game",
      randomSeed: freshSeed(),
      lengthInRounds,
      fleetSize,
    });
    setScreen("game");
  }

  /** The game-over panel's button: back to the start screen, nothing else. */
  function handleReturnToStart() {
    setScreen("start");
  }

  // The panel takes over the whole cabinet once the game has ended and the
  // last turn's score roll has settled — until then the game stays on
  // screen and the HUD keeps counting up.
  const gameOver = isGameOver(session.state) && settled;

  return (
    <main className="app">
      <div className="app__cabinet">
        {screen === "start" ? (
          <StartScreen
            fleetSize={fleetSize}
            onFleetSizeChange={setFleetSize}
            lengthInRounds={lengthInRounds}
            onLengthInRoundsChange={setLengthInRounds}
            onPlay={handlePlay}
          />
        ) : gameOver ? (
          <GameOverPanel
            state={session.state}
            onReturnToStart={handleReturnToStart}
          />
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
