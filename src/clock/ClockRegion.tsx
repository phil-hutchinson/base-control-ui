// Both players' clocks (rules.md §10), shown in the third region. Calls
// `useGameClock` itself so a tick repaints this region alone, never the
// board — `App` never touches the ticking value.

import type { SessionIntent } from "../game/session";
import type { ClockSetting } from "../rules/clock";
import type { Side } from "../rules/fleet";
import { isGameOver } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";
import { formatClockReading } from "./clockReading";
import { useGameClock } from "./useGameClock";
import "./ClockRegion.css";

const SIDE_NAME: Readonly<Record<Side, string>> = {
  green: "Green",
  red: "Red",
};

interface SideClockProps {
  readonly side: Side;
  readonly remainingMs: number;
  readonly isRunning: boolean;
}

/** One side's clock: its name, above a reading that flashes once it reaches zero. */
function SideClock({ side, remainingMs, isRunning }: SideClockProps) {
  const atZero = remainingMs <= 0;
  const classes = [
    "clock-display",
    `clock-display--${side}`,
    isRunning ? "clock-display--running" : "clock-display--idle",
    atZero ? "clock-display--zero" : "",
  ]
    .filter((name) => name !== "")
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      <span className="clock-display__name">{SIDE_NAME[side]}</span>
      <span className="clock-display__reading">
        {formatClockReading(remainingMs)}
      </span>
    </div>
  );
}

interface ClockRegionProps {
  /** The session's game state, read for the side to move and passed to `useGameClock`. */
  readonly state: GameState;
  readonly clockSetting: ClockSetting;
  /** Dispatches a clock intent to the session reducer, the same shape `Board` takes. */
  readonly onIntent: (intent: SessionIntent) => void;
}

/**
 * Both clocks, green first (rules.md §10). The side marked as running is
 * the side to move while the game is in progress, whether its reading
 * counts down or reads `INF`.
 */
export function ClockRegion({
  state,
  clockSetting,
  onIntent,
}: ClockRegionProps) {
  const { remainingMs } = useGameClock(state, clockSetting, onIntent);
  const runningSide: Side | undefined = isGameOver(state)
    ? undefined
    : state.sideToMove;

  return (
    <div className="clock-region">
      <SideClock
        side="green"
        remainingMs={remainingMs.green}
        isRunning={runningSide === "green"}
      />
      <SideClock
        side="red"
        remainingMs={remainingMs.red}
        isRunning={runningSide === "red"}
      />
    </div>
  );
}
