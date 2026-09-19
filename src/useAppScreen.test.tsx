// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppScreen } from "./useAppScreen";

afterEach(cleanup);

// jsdom keeps one location for the whole file; without this a test that left
// a fragment behind would decide which screen the next test mounts on.
function resetAddress() {
  window.history.replaceState(null, "", "/");
}

beforeEach(resetAddress);
afterEach(resetAddress);

describe("useAppScreen", () => {
  it("opens on the start screen with the default options", () => {
    const { result } = renderHook(() => useAppScreen(vi.fn(), false));

    expect(result.current.screen).toBe("start");
    expect(result.current.fleetSize).toBe(6);
    expect(result.current.chargedNodeCount).toBe(5);
    expect(result.current.combatEnabled).toBe(false);
    expect(result.current.scoring).toBe("simple");
    expect(result.current.nodeRotation).toBe("continuous");
    expect(result.current.lengthInRounds).toBe(30);
    expect(result.current.clockSetting).toBe("none");
  });

  it("PLAY dispatches the selected options as a new game and moves to the game screen", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setFleetSize(5);
    });
    act(() => {
      result.current.setChargedNodeCount(4);
    });
    act(() => {
      result.current.setLengthInRounds(45);
    });
    act(() => {
      result.current.setClockSetting(6);
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: "new-game",
        fleetSize: 5,
        chargedNodeCount: 4,
        combatEnabled: false,
        scoring: "simple",
        lengthInRounds: 45,
      }),
    );
    expect(result.current.screen).toBe("game");
  });

  it("carries a chosen combat setting of on into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    // gameOver: true — handleReturnToStart is reached from a game in progress
    // only through the game-over panel's button, so this is the flow that
    // actually crosses the guard without a confirmation prompt.
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setCombatEnabled(true);
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", combatEnabled: true }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.combatEnabled).toBe(true);

    dispatch.mockClear();
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", combatEnabled: true }),
    );
  });

  it("carries a chosen scoring setting of bonus into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setScoring("bonus");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", scoring: "bonus" }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.scoring).toBe("bonus");

    dispatch.mockClear();
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", scoring: "bonus" }),
    );
  });

  it("carries a chosen node rotation setting of dedicated into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setNodeRotation("dedicated");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", nodeRotation: "dedicated" }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.nodeRotation).toBe("dedicated");

    dispatch.mockClear();
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", nodeRotation: "dedicated" }),
    );
  });

  it("carries a chosen charged-node count of three into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setChargedNodeCount(3);
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", chargedNodeCount: 3 }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.chargedNodeCount).toBe(3);
  });

  it("returning to start moves to the start screen and changes none of the options", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setFleetSize(6);
    });
    act(() => {
      result.current.setChargedNodeCount(4);
    });
    act(() => {
      result.current.setLengthInRounds(60);
    });
    act(() => {
      result.current.setClockSetting(4);
    });
    act(() => {
      result.current.handlePlay();
    });
    dispatch.mockClear();

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.fleetSize).toBe(6);
    expect(result.current.chargedNodeCount).toBe(4);
    expect(result.current.lengthInRounds).toBe(60);
    expect(result.current.clockSetting).toBe(4);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("opening the guide moves to the guide screen and changes nothing else", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.handleOpenGuide();
    });

    expect(result.current.screen).toBe("guide");
    expect(result.current.fleetSize).toBe(6);
    expect(result.current.lengthInRounds).toBe(30);
    expect(result.current.clockSetting).toBe("none");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("options set before opening the guide survive opening it and returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setFleetSize(5);
    });
    act(() => {
      result.current.setLengthInRounds(45);
    });
    act(() => {
      result.current.setClockSetting(6);
    });
    act(() => {
      result.current.handleOpenGuide();
    });
    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.fleetSize).toBe(5);
    expect(result.current.lengthInRounds).toBe(45);
    expect(result.current.clockSetting).toBe(6);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
