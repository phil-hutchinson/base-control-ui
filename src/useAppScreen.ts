// The app's front door: which screen is showing, the two options chosen on
// the start screen, and the two actions that move between screens. Lives
// outside App.tsx so PLAY's wiring and the return to start are a real unit,
// exercised on their own rather than only through the whole app.

import { useState } from "react";
import { freshSeed } from "./game/seed";
import type { SessionIntent } from "./game/session";
import { DEFAULT_FLEET_SIZE, type FleetSize } from "./rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./rules/gameLength";

/** Which screen is on top: the start screen, or a game in progress. */
export type Screen = "start" | "game";

/** The app's current screen and options, plus the actions that change either. */
export interface AppScreen {
  readonly screen: Screen;
  readonly fleetSize: FleetSize;
  readonly lengthInRounds: number;
  readonly setFleetSize: (fleetSize: FleetSize) => void;
  readonly setLengthInRounds: (lengthInRounds: number) => void;
  readonly handlePlay: () => void;
  readonly handleReturnToStart: () => void;
}

/**
 * Holds which screen is showing and the two options chosen on the start
 * screen, so a finished game returns to the start screen with the options
 * it was played with still set. `handlePlay` dispatches `new-game` with a
 * fresh seed and the two selected options through `dispatch`, then switches
 * to the game screen; `handleReturnToStart` switches back to the start
 * screen and changes nothing else.
 */
export function useAppScreen(
  dispatch: (intent: SessionIntent) => void,
): AppScreen {
  const [screen, setScreen] = useState<Screen>("start");
  const [fleetSize, setFleetSize] = useState<FleetSize>(DEFAULT_FLEET_SIZE);
  const [lengthInRounds, setLengthInRounds] = useState(
    DEFAULT_GAME_LENGTH_ROUNDS,
  );

  function handlePlay() {
    dispatch({
      type: "new-game",
      randomSeed: freshSeed(),
      lengthInRounds,
      fleetSize,
    });
    setScreen("game");
  }

  function handleReturnToStart() {
    setScreen("start");
  }

  return {
    screen,
    fleetSize,
    lengthInRounds,
    setFleetSize,
    setLengthInRounds,
    handlePlay,
    handleReturnToStart,
  };
}
