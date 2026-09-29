// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NODE_PLAYSTYLES } from "./rules/nodePlaystyle";
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
    expect(result.current.fleetSize).toBe(5);
    expect(result.current.chargedNodeCount).toBe(4);
    expect(result.current.scoring).toBe("bonus");
    expect(result.current.nodePlaystyle).toBe("steal");
    expect(result.current.planetBonus).toBe("off");
    expect(result.current.planetActivity).toBe("race");
    expect(result.current.playerMatching).toBe("required");
    expect(result.current.lengthInRounds).toBe(30);
    expect(result.current.clockSetting).toBe("none");
  });

  it("PLAY dispatches the selected options as a new game and moves to the game screen", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setFleetSize(4);
    });
    act(() => {
      result.current.setChargedNodeCount(5);
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
        fleetSize: 4,
        chargedNodeCount: 5,
        combatEnabled: false,
        scoring: "bonus",
        lengthInRounds: 45,
      }),
    );
    expect(result.current.screen).toBe("game");
  });

  it("always dispatches combat off, under every node playstyle", () => {
    for (const nodePlaystyle of NODE_PLAYSTYLES) {
      const dispatch = vi.fn();
      const { result, unmount } = renderHook(() =>
        useAppScreen(dispatch, false),
      );

      act(() => {
        result.current.setNodePlaystyle(nodePlaystyle);
      });
      act(() => {
        result.current.handlePlay();
      });

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          type: "new-game",
          nodePlaystyle,
          combatEnabled: false,
        }),
      );

      unmount();
      resetAddress();
    }
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

  it("carries a chosen node playstyle of dedicated into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setNodePlaystyle("dedicated");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", nodePlaystyle: "dedicated" }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.nodePlaystyle).toBe("dedicated");

    dispatch.mockClear();
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", nodePlaystyle: "dedicated" }),
    );
  });

  it("carries a chosen planet bonus setting of three into the new-game intent, and keeps it on returning to start", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, true));

    act(() => {
      result.current.setNodePlaystyle("planet");
    });
    act(() => {
      result.current.setPlanetBonus("three");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", planetBonus: "three" }),
    );

    act(() => {
      result.current.handleReturnToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(result.current.planetBonus).toBe("three");

    dispatch.mockClear();
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", planetBonus: "three" }),
    );
  });

  it("remembers planet bonus and planet effects separately across node playstyle switches", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    act(() => {
      result.current.setPlanetActivity("stable");
    });
    act(() => {
      result.current.setNodePlaystyle("planet");
    });
    act(() => {
      result.current.setPlanetBonus("three");
    });
    expect(result.current.planetActivity).toBe("stable");
    expect(result.current.planetBonus).toBe("three");

    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    expect(result.current.planetActivity).toBe("stable");
    expect(result.current.planetBonus).toBe("three");
  });

  it("PLAY under steal dispatches planet bonus off with the remembered planet effects", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setPlanetBonus("three");
    });
    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    act(() => {
      result.current.setPlanetActivity("stable");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: "new-game",
        nodePlaystyle: "steal",
        planetBonus: "off",
        planetActivity: "stable",
      }),
    );
  });

  it("PLAY under planet dispatches planet effects off with the remembered planet bonus", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    act(() => {
      result.current.setPlanetActivity("stable");
    });
    act(() => {
      result.current.setNodePlaystyle("planet");
    });
    act(() => {
      result.current.setPlanetBonus("two");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: "new-game",
        nodePlaystyle: "planet",
        planetBonus: "two",
        planetActivity: "off",
      }),
    );
  });

  it("dispatches the player-matching setting only while the node playstyle is steal, and remembers it switching back", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppScreen(dispatch, false));

    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    act(() => {
      result.current.setPlayerMatching("double");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", playerMatching: "double" }),
    );

    dispatch.mockClear();
    act(() => {
      result.current.setNodePlaystyle("planet");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", playerMatching: "off" }),
    );

    dispatch.mockClear();
    act(() => {
      result.current.setNodePlaystyle("steal");
    });
    act(() => {
      result.current.handlePlay();
    });

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "new-game", playerMatching: "double" }),
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
      result.current.setFleetSize(4);
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
    expect(result.current.fleetSize).toBe(4);
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
    expect(result.current.fleetSize).toBe(5);
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
