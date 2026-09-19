// The app's front door: which screen is showing, the seven options chosen on
// the start screen, and the two actions that move between screens. Lives
// outside App.tsx so PLAY's wiring and the return to start are a real unit,
// exercised on their own rather than only through the whole app. Which
// screen is showing is decided by the browser's address, not by state kept
// here (`useScreenAddress`); this module only owns the options and dispatches
// the session intent PLAY needs.

import { useState } from "react";
import { freshSeed } from "./game/seed";
import type { SessionIntent } from "./game/session";
import type { Screen } from "./nav/screenAddress";
import { useScreenAddress } from "./nav/useScreenAddress";
import { type ClockSetting, DEFAULT_CLOCK_SETTING } from "./rules/clock";
import { DEFAULT_COMBAT_ENABLED } from "./rules/combatSetting";
import { DEFAULT_FLEET_SIZE, type FleetSize } from "./rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./rules/gameLength";
import {
  DEFAULT_NODE_ROTATION,
  type NodeRotationSetting,
} from "./rules/nodeRotation";
import {
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
} from "./rules/nodes";
import { DEFAULT_SCORING, type ScoringSetting } from "./rules/scoring";

/** The app's current screen and options, plus the actions that change either. */
export interface AppScreen {
  readonly screen: Screen;
  readonly fleetSize: FleetSize;
  readonly chargedNodeCount: ChargedNodeCount;
  readonly combatEnabled: boolean;
  readonly scoring: ScoringSetting;
  readonly nodeRotation: NodeRotationSetting;
  readonly lengthInRounds: number;
  readonly clockSetting: ClockSetting;
  readonly setFleetSize: (fleetSize: FleetSize) => void;
  readonly setChargedNodeCount: (chargedNodeCount: ChargedNodeCount) => void;
  readonly setCombatEnabled: (combatEnabled: boolean) => void;
  readonly setScoring: (scoring: ScoringSetting) => void;
  readonly setNodeRotation: (nodeRotation: NodeRotationSetting) => void;
  readonly setLengthInRounds: (lengthInRounds: number) => void;
  readonly setClockSetting: (clockSetting: ClockSetting) => void;
  readonly handlePlay: () => void;
  readonly handleReturnToStart: () => void;
  readonly handleOpenGuide: () => void;
}

/**
 * Holds the seven options chosen on the start screen, so a finished game
 * returns to the start screen with the options it was played with still set,
 * and delegates which screen is showing to `useScreenAddress`, which reads it
 * from the browser's address. `handlePlay` dispatches `new-game` with a fresh
 * seed and the fleet size, charged-node count, combat setting, scoring
 * setting, node rotation setting and length through `dispatch`, then hands
 * the game its address; `handleReturnToStart` moves the browser back, the
 * same as its own Back button. The clock setting is not part of `new-game` —
 * the rules layer knows nothing about time — so it is held here purely for
 * the game screen to read. `handleOpenGuide` opens the quick guide at its own
 * address and changes nothing else; there is no matching close action,
 * because `handleReturnToStart` already means "leave for the start screen",
 * which is exactly what leaving the guide does.
 */
export function useAppScreen(
  dispatch: (intent: SessionIntent) => void,
  gameOver: boolean,
): AppScreen {
  const { screen, showGame, showGuide, leaveToStart } =
    useScreenAddress(gameOver);
  const [fleetSize, setFleetSize] = useState<FleetSize>(DEFAULT_FLEET_SIZE);
  const [chargedNodeCount, setChargedNodeCount] = useState<ChargedNodeCount>(
    DEFAULT_CHARGED_NODE_COUNT,
  );
  const [combatEnabled, setCombatEnabled] = useState(DEFAULT_COMBAT_ENABLED);
  const [scoring, setScoring] = useState<ScoringSetting>(DEFAULT_SCORING);
  const [nodeRotation, setNodeRotation] = useState<NodeRotationSetting>(
    DEFAULT_NODE_ROTATION,
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
      combatEnabled,
      scoring,
      nodeRotation,
    });
    showGame();
  }

  function handleReturnToStart() {
    leaveToStart();
  }

  function handleOpenGuide() {
    showGuide();
  }

  return {
    screen,
    fleetSize,
    chargedNodeCount,
    combatEnabled,
    scoring,
    nodeRotation,
    lengthInRounds,
    clockSetting,
    setFleetSize,
    setChargedNodeCount,
    setCombatEnabled,
    setScoring,
    setNodeRotation,
    setLengthInRounds,
    setClockSetting,
    handlePlay,
    handleReturnToStart,
    handleOpenGuide,
  };
}
