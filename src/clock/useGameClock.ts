// §10's running clock: how much of each side's budget is left, and which
// side (if any) is currently spending theirs. Remaining time is computed
// fresh from a monotonic timestamp on every render and never accumulated by
// a tick, so a tick that is late, throttled or coalesced cannot gain or
// lose a player time. Called from `ClockRegion`, never from `App`: the local
// re-render a tick causes must repaint the clock region alone, never the
// board.

import { useEffect, useRef, useState } from "react";
import type { SessionIntent } from "../game/session";
import { type ClockSetting, startingBudgetMs } from "../rules/clock";
import type { Side } from "../rules/fleet";
import { isGameOver } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";

/** How often the display repaints while a side is running (rules.md §10). */
const TICK_INTERVAL_MS = 100;

/**
 * How long an out-of-time turn sits on screen before it is passed
 * (rules.md §8.6, §10): fixed, not tuned, so the passed turn reads as a
 * turn happening rather than several rounds resolving in one repaint.
 */
const OUT_OF_TIME_PASS_DELAY_MS = 1000;

/** Both sides' remaining time, and which side (if any) is currently running. */
export interface GameClockReading {
  readonly remainingMs: Readonly<Record<Side, number>>;
  readonly tickingSide: Side | undefined;
}

/** A side's remaining time: its budget, minus what it has spent, minus, while running, the time since it started. */
function remainingMsForSide(
  budget: number,
  spentMs: number,
  isRunning: boolean,
  startedAt: number | undefined,
  now: number,
): number {
  const elapsed = isRunning && startedAt !== undefined ? now - startedAt : 0;
  return Math.max(0, budget - spentMs - elapsed);
}

/**
 * The running clock for one game (rules.md §10). "Running" is exactly the
 * side to move, while a game is in progress: never on the start screen or
 * the game-over panel, and never at all with `setting` at `"none"`, which
 * starts no interval and no timers and reports both sides as infinite.
 *
 * Dispatches `clock-expired` to `onIntent` promptly once the running side's
 * real remaining time reaches zero, and `pass-out-of-time` a fixed beat
 * later while the side to move is out of time and the game is not over. The
 * budget is read from `state.lengthInRounds`, the authority on the game
 * being played, not from a start-screen option that could drift mid-game.
 */
export function useGameClock(
  state: GameState,
  setting: ClockSetting,
  onIntent: (intent: SessionIntent) => void,
): GameClockReading {
  const budget = startingBudgetMs(state.lengthInRounds, setting);

  const spentRef = useRef<Record<Side, number>>({ green: 0, red: 0 });
  const tickingSideRef = useRef<Side | undefined>(undefined);
  const startedAtRef = useRef<number | undefined>(undefined);
  const [, setTick] = useState(0);

  const tickingSide: Side | undefined =
    setting !== "none" && !isGameOver(state) ? state.sideToMove : undefined;

  // Hands the clock over: commits the elapsed time to whichever side was
  // running before this change, then starts the new side (if any) from now.
  // Idempotent against a redundant re-invocation with the same running side
  // (e.g. StrictMode's mount/remount simulation), because elapsed time is
  // never committed from an effect cleanup — that would double-charge a
  // player on every mount in development.
  useEffect(() => {
    const now = performance.now();
    const previousSide = tickingSideRef.current;
    if (previousSide === tickingSide) {
      return;
    }
    if (previousSide !== undefined && startedAtRef.current !== undefined) {
      spentRef.current = {
        ...spentRef.current,
        [previousSide]:
          spentRef.current[previousSide] + (now - startedAtRef.current),
      };
    }
    tickingSideRef.current = tickingSide;
    startedAtRef.current = tickingSide === undefined ? undefined : now;
  }, [tickingSide]);

  // Ticks the display while a side is running, and reports expiry the
  // moment the running side's real remaining time reaches zero. Restarts
  // whenever the game state changes, so a stale closure never keeps
  // re-dispatching expiry once the state already records it.
  useEffect(() => {
    if (tickingSide === undefined) {
      return;
    }
    const interval = setInterval(() => {
      setTick((tick) => tick + 1);
      const now = performance.now();
      const remaining = remainingMsForSide(
        budget,
        spentRef.current[tickingSide],
        true,
        startedAtRef.current,
        now,
      );
      if (remaining <= 0 && !state.outOfTime[tickingSide]) {
        onIntent({ type: "clock-expired", side: tickingSide });
      }
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tickingSide, budget, state, onIntent]);

  // Paces the out-of-time pass so each one reads as its own turn. Re-arms
  // whenever the state changes (so every ply gets its own beat) and clears
  // its timer on cleanup, so it fires at most once per turn.
  useEffect(() => {
    if (
      setting === "none" ||
      isGameOver(state) ||
      !state.outOfTime[state.sideToMove]
    ) {
      return;
    }
    const timeout = setTimeout(() => {
      onIntent({ type: "pass-out-of-time" });
    }, OUT_OF_TIME_PASS_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [setting, state, onIntent]);

  const now = performance.now();
  const remainingMs: Record<Side, number> = {
    green: remainingMsForSide(
      budget,
      spentRef.current.green,
      tickingSideRef.current === "green",
      startedAtRef.current,
      now,
    ),
    red: remainingMsForSide(
      budget,
      spentRef.current.red,
      tickingSideRef.current === "red",
      startedAtRef.current,
      now,
    ),
  };

  return { remainingMs, tickingSide };
}
