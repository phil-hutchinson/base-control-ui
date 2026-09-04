// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionIntent } from "../game/session";
import type { GameState } from "../rules/gameState";
import { pliesForGameLength } from "../rules/gameLength";
import { useGameClock } from "./useGameClock";

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    ships: [],
    nodes: {},
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: 30,
    outOfTime: { green: false, red: false },
    ...overrides,
  };
}

type IntentMock = ReturnType<typeof vi.fn<(intent: SessionIntent) => void>>;

function clockExpiredCalls(onIntent: IntentMock) {
  return onIntent.mock.calls.filter(
    ([intent]) => intent.type === "clock-expired",
  );
}

function passOutOfTimeCalls(onIntent: IntentMock) {
  return onIntent.mock.calls.filter(
    ([intent]) => intent.type === "pass-out-of-time",
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useGameClock", () => {
  it("starts green running the moment it mounts, leaving red untouched", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 30, sideToMove: "green" });
    const { result } = renderHook(() => useGameClock(state, 6, onIntent));

    expect(result.current.tickingSide).toBe("green");
    expect(result.current.remainingMs.green).toBe(180_000);
    expect(result.current.remainingMs.red).toBe(180_000);
  });

  it("reduces the running side's remaining time and leaves the idle side exactly where it was", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 30, sideToMove: "green" });
    const { result } = renderHook(() => useGameClock(state, 6, onIntent));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.remainingMs.green).toBe(175_000);
    expect(result.current.remainingMs.red).toBe(180_000);
  });

  it("hands the clock over when the side to move changes: the first side freezes, the second starts falling", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const greenState = buildState({ lengthInRounds: 30, sideToMove: "green" });
    const { result, rerender } = renderHook(
      ({ state }) => useGameClock(state, 6, onIntent),
      { initialProps: { state: greenState } },
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    const greenRemainingAtHandover = result.current.remainingMs.green;
    expect(greenRemainingAtHandover).toBe(175_000);

    const redState = buildState({
      lengthInRounds: 30,
      sideToMove: "red",
      plyNumber: 2,
    });
    act(() => {
      rerender({ state: redState });
    });

    expect(result.current.tickingSide).toBe("red");
    expect(result.current.remainingMs.green).toBe(greenRemainingAtHandover);
    expect(result.current.remainingMs.red).toBe(180_000);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.remainingMs.green).toBe(greenRemainingAtHandover);
    expect(result.current.remainingMs.red).toBe(177_000);
  });

  it("dispatches clock-expired for the running side, exactly once, once its budget is exhausted", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 1, sideToMove: "green" });
    renderHook(() => useGameClock(state, 2, onIntent));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    const calls = clockExpiredCalls(onIntent);
    expect(calls).toEqual([[{ type: "clock-expired", side: "green" }]]);
  });

  it("does not dispatch clock-expired again once the state already records the side as out of time", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 1, sideToMove: "green" });
    const { rerender } = renderHook(
      ({ state }) => useGameClock(state, 2, onIntent),
      { initialProps: { state } },
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(clockExpiredCalls(onIntent)).toHaveLength(1);

    act(() => {
      rerender({
        state: buildState({
          lengthInRounds: 1,
          sideToMove: "green",
          outOfTime: { green: true, red: false },
        }),
      });
    });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(clockExpiredCalls(onIntent)).toHaveLength(1);
  });

  it("dispatches the out-of-time pass after the pacing delay, not before, once per ply", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const outOfTimeState = buildState({
      lengthInRounds: 1,
      sideToMove: "green",
      outOfTime: { green: true, red: false },
    });
    renderHook(() => useGameClock(outOfTimeState, 2, onIntent));

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(passOutOfTimeCalls(onIntent)).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(passOutOfTimeCalls(onIntent)).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(passOutOfTimeCalls(onIntent)).toHaveLength(1);
  });

  it("runs and dispatches nothing once the game is over", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const overState = buildState({
      lengthInRounds: 1,
      sideToMove: "green",
      outOfTime: { green: true, red: true },
    });
    const { result } = renderHook(() => useGameClock(overState, 2, onIntent));

    expect(result.current.tickingSide).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onIntent).not.toHaveBeenCalled();
  });

  it("reports both sides as infinite with nobody running, and dispatches nothing, with no clock", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 30, sideToMove: "green" });
    const { result } = renderHook(() => useGameClock(state, "none", onIntent));

    expect(result.current.tickingSide).toBeUndefined();
    expect(result.current.remainingMs.green).toBe(Number.POSITIVE_INFINITY);
    expect(result.current.remainingMs.red).toBe(Number.POSITIVE_INFINITY);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.remainingMs.green).toBe(Number.POSITIVE_INFINITY);
    expect(result.current.remainingMs.red).toBe(Number.POSITIVE_INFINITY);
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("reflects a long jump in time by the elapsed span, not by the number of ticks that ran", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ lengthInRounds: 90, sideToMove: "green" });
    const { result } = renderHook(() => useGameClock(state, 6, onIntent));

    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    expect(result.current.remainingMs.green).toBe(540_000 - 65_000);
  });

  it("keeps the game's own length as the authority on the budget, unaffected by the plies-run-out check alone", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    // A state past its nominal last ply, but not both out of time, is a
    // sanity check that isGameOver's plies-exhausted branch also stops the
    // clock, exactly as the both-out-of-time branch does.
    const state = buildState({
      lengthInRounds: 1,
      sideToMove: "green",
      plyNumber: pliesForGameLength(1) + 1,
    });
    const { result } = renderHook(() => useGameClock(state, 2, onIntent));

    expect(result.current.tickingSide).toBeUndefined();
  });
});
