// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppScreen } from "./useAppScreen";

afterEach(cleanup);

describe("useAppScreen", () => {
  it("opens on the start screen with the default options", () => {
    const { result } = renderHook(() => useAppScreen(vi.fn()));

    expect(result.current.screen).toBe("start");
    expect(result.current.fleetSize).toBe(7);
    expect(result.current.lengthInRounds).toBe(30);
  });

  it("PLAY dispatches the selected options as a new game and moves to the game screen", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch));

    act(() => {
      result.current.setFleetSize(5);
    });
    act(() => {
      result.current.setLengthInRounds(50);
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: "new-game",
        fleetSize: 5,
        lengthInRounds: 50,
      }),
    );
    expect(result.current.screen).toBe("game");
  });

  it("returning to start moves to the start screen and changes neither option", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch));

    act(() => {
      result.current.setFleetSize(6);
    });
    act(() => {
      result.current.setLengthInRounds(75);
    });
    act(() => {
      result.current.handlePlay();
    });
    dispatch.mockClear();

    act(() => {
      result.current.handleReturnToStart();
    });

    expect(result.current.screen).toBe("start");
    expect(result.current.fleetSize).toBe(6);
    expect(result.current.lengthInRounds).toBe(75);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
