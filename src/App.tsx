import { useReducer } from "react";
import { Board } from "./board/Board";
import { ClockRegion } from "./clock/ClockRegion";
import { freshSeed } from "./game/seed";
import { createSession, sessionReducer } from "./game/session";
import { GAME_NAME } from "./gameName";
import { GameOverPanel } from "./hud/GameOverPanel";
import { Hud } from "./hud/Hud";
import { useDisplayedEnergy } from "./hud/useDisplayedEnergy";
import { isGameOver } from "./rules/gameLength";
import { startingGameState } from "./rules/gameState";
import { ShipDefs } from "./ships/ShipDefs";
import { StartScreen } from "./start/StartScreen";
import { useAppScreen } from "./useAppScreen";
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
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createStartingSession,
  );
  const {
    screen,
    fleetSize,
    setFleetSize,
    lengthInRounds,
    setLengthInRounds,
    clockSetting,
    setClockSetting,
    handlePlay,
    handleReturnToStart,
  } = useAppScreen(dispatch);
  const { displayed: displayedEnergy, settled } = useDisplayedEnergy(
    session.state.energy,
  );

  // The panel takes over the whole cabinet once the game has ended and the
  // last turn's score roll has settled — until then the game stays on
  // screen and the HUD keeps counting up.
  const gameOver = isGameOver(session.state) && settled;

  return (
    <main className="app">
      <ShipDefs />
      <div className="app__cabinet">
        {screen === "start" ? (
          <StartScreen
            fleetSize={fleetSize}
            onFleetSizeChange={setFleetSize}
            lengthInRounds={lengthInRounds}
            onLengthInRoundsChange={setLengthInRounds}
            clockSetting={clockSetting}
            onClockSettingChange={setClockSetting}
            onPlay={handlePlay}
          />
        ) : gameOver ? (
          <GameOverPanel
            state={session.state}
            onReturnToStart={handleReturnToStart}
          />
        ) : (
          <div className="app__screen">
            <div className="app__info">
              <h1 className="app__title">{GAME_NAME}</h1>
              <Hud state={session.state} displayedEnergy={displayedEnergy} />
            </div>
            <div className="app__play">
              <Board session={session} onIntent={dispatch} />
            </div>
            <div className="app__clocks">
              <ClockRegion
                state={session.state}
                clockSetting={clockSetting}
                onIntent={dispatch}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
