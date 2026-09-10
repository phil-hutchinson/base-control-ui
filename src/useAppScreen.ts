// The app's front door: which screen is showing, the four options chosen on
// the start screen, and the two actions that move between screens. Lives
// outside App.tsx so PLAY's wiring and the return to start are a real unit,
// exercised on their own rather than only through the whole app.

import { useState } from "react";
import { freshSeed } from "./game/seed";
import type { SessionIntent } from "./game/session";
import { type ClockSetting, DEFAULT_CLOCK_SETTING } from "./rules/clock";
import { DEFAULT_FLEET_SIZE, type FleetSize } from "./rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./rules/gameLength";
import {
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
} from "./rules/nodes";

/**
 * Which screen is on top: the start screen, a game in progress, or the
 * quick guide.
 */
export type Screen = "start" | "game" | "guide";

/** The app's current screen and options, plus the actions that change either. */
export interface AppScreen {
  readonly screen: Screen;
  readonly fleetSize: FleetSize;
  readonly chargedNodeCount: ChargedNodeCount;
  readonly lengthInRounds: number;
  readonly clockSetting: ClockSetting;
  readonly setFleetSize: (fleetSize: FleetSize) => void;
  readonly setChargedNodeCount: (chargedNodeCount: ChargedNodeCount) => void;
  readonly setLengthInRounds: (lengthInRounds: number) => void;
  readonly setClockSetting: (clockSetting: ClockSetting) => void;
  readonly handlePlay: () => void;
  readonly handleReturnToStart: () => void;
  readonly handleOpenGuide: () => void;
}

/**
 * Holds which screen is showing and the four options chosen on the start
 * screen, so a finished game returns to the start screen with the options
 * it was played with still set. `handlePlay` dispatches `new-game` with a
 * fresh seed and the fleet size, charged-node count and length through
 * `dispatch`, then switches to the game screen; `handleReturnToStart`
 * switches back to the start screen and changes nothing else. The clock
 * setting is not part of `new-game` — the rules layer knows nothing about
 * time — so it is held here purely for the game screen to read.
 * `handleOpenGuide` switches to the quick guide and changes nothing else;
 * there is no matching close action, because `handleReturnToStart` already
 * means "show the start screen and change nothing else", which is exactly
 * what leaving the guide does.
 */
export function useAppScreen(
  dispatch: (intent: SessionIntent) => void,
): AppScreen {
  const [screen, setScreen] = useState<Screen>("start");
  const [fleetSize, setFleetSize] = useState<FleetSize>(DEFAULT_FLEET_SIZE);
  const [chargedNodeCount, setChargedNodeCount] = useState<ChargedNodeCount>(
    DEFAULT_CHARGED_NODE_COUNT,
  );
  const [lengthInRounds, setLengthInRounds] = useState(
    DEFAULT_GAME_LENGTH_ROUNDS,
  );
  const [clockSetting, setClockSetting] = useState<ClockSetting>(
    DEFAULT_CLOCK_SETTING,
  );

  function handlePlay() {
    dispatch({
      type: "new-game",
      randomSeed: freshSeed(),
      lengthInRounds,
      fleetSize,
      chargedNodeCount,
    });
    setScreen("game");
  }

  function handleReturnToStart() {
    setScreen("start");
  }

  function handleOpenGuide() {
    setScreen("guide");
  }

  return {
    screen,
    fleetSize,
    chargedNodeCount,
    lengthInRounds,
    clockSetting,
    setFleetSize,
    setChargedNodeCount,
    setLengthInRounds,
    setClockSetting,
    handlePlay,
    handleReturnToStart,
    handleOpenGuide,
  };
}
