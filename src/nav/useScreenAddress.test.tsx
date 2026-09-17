// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEAVE_GAME_PROMPT } from "./screenAddress";
import { useScreenAddress } from "./useScreenAddress";

// Vitest's globals are off (see vite.config.ts), so Testing Library's
// automatic cleanup never registers itself.
afterEach(cleanup);

// jsdom keeps one location for the whole file; without this a test that left a
// fragment behind would decide which screen the next test mounts on.
function resetAddress() {
  window.history.replaceState(null, "", "/");
}

beforeEach(resetAddress);
afterEach(() => {
  vi.restoreAllMocks();
  resetAddress();
});

/** Mounts the hook at `hash`, as a cold load of that address would. */
function renderAt(hash: string, gameOver = false) {
  window.history.replaceState(null, "", `/${hash}`);
  return renderHook(({ over }) => useScreenAddress(over), {
    initialProps: { over: gameOver },
  });
}

/**
 * A Back or Forward press, without waiting on the browser: the address moves
 * and the event the browser would fire is dispatched. `history.back()` is
 * asynchronous, so the tests that are not about history's own shape use this.
 */
function traverseTo(hash: string) {
  act(() => {
    window.history.replaceState(null, "", `/${hash}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

/** Stubs the confirm box, which jsdom does not implement. */
function stubConfirm(answer: boolean) {
  return vi.spyOn(window, "confirm").mockReturnValue(answer);
}

describe("the screen the address names", () => {
  it("reads the menu, the guide and an address it never issued", () => {
    expect(renderAt("").result.current.screen).toBe("start");
    cleanup();
    expect(renderAt("#how-to-play").result.current.screen).toBe("guide");
    cleanup();
    expect(renderAt("#nonsense").result.current.screen).toBe("start");
  });

  it("shows the menu at #game when there is no game, and corrects the address", async () => {
    const { result } = renderAt("#game");

    expect(result.current.screen).toBe("start");
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
  });
});

describe("the actions", () => {
  it("shows a dealt game at #game", () => {
    const { result } = renderAt("");

    act(() => {
      result.current.showGame();
    });

    expect(result.current.screen).toBe("game");
    expect(window.location.hash).toBe("#game");
  });

  it("opens the guide at its own address", () => {
    const { result } = renderAt("");

    act(() => {
      result.current.showGuide();
    });

    expect(result.current.screen).toBe("guide");
    expect(window.location.hash).toBe("#how-to-play");
  });

  it("leaves the guide by going back, as the browser's own Back does", async () => {
    const { result } = renderAt("");
    act(() => {
      result.current.showGuide();
    });

    act(() => {
      result.current.leaveToStart();
    });

    await waitFor(() => {
      expect(result.current.screen).toBe("start");
    });
    expect(window.location.hash).toBe("");
  });
});

describe("traversing", () => {
  it("returns to the menu from the guide with nothing to correct", () => {
    const { result } = renderAt("#how-to-play");

    traverseTo("");

    expect(result.current.screen).toBe("start");
    expect(window.location.hash).toBe("");
  });

  it("does not resume an abandoned game on the way forward", async () => {
    const confirm = stubConfirm(true);
    const { result } = renderAt("");
    act(() => {
      result.current.showGame();
    });

    traverseTo("");
    expect(result.current.screen).toBe("start");

    // Forward, back onto the game's own address: there is no game left to
    // show, so the menu stays and the address is corrected.
    traverseTo("#game");

    expect(result.current.screen).toBe("start");
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    expect(confirm).toHaveBeenCalledOnce();
  });
});

describe("backing out of a game in progress", () => {
  it("asks, once, in the story's words", () => {
    const confirm = stubConfirm(true);
    const { result } = renderAt("");
    act(() => {
      result.current.showGame();
    });

    traverseTo("");

    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(LEAVE_GAME_PROMPT);
  });

  it("declined, keeps the game and leaves history the shape it was", async () => {
    const confirm = stubConfirm(false);
    const { result } = renderAt("");
    act(() => {
      result.current.showGame();
    });
    const entriesBefore = window.history.length;

    // A real Back press, because this test is about the shape history is left
    // in. It is asynchronous, so wait on the guard having been asked — waiting
    // on the hash would pass instantly, before the traversal had happened.
    await act(async () => {
      window.history.back();
      await waitFor(() => {
        expect(confirm).toHaveBeenCalledOnce();
      });
    });

    expect(result.current.screen).toBe("game");
    expect(window.location.hash).toBe("#game");
    // Pushing #game back discards the stale forward entry rather than adding
    // to it, so the next Back press asks again instead of doing nothing.
    expect(window.history.length).toBe(entriesBefore);
  });

  it("accepted, shows the menu and does not ask a second time", async () => {
    const confirm = stubConfirm(true);
    const { result } = renderAt("");
    act(() => {
      result.current.showGame();
    });

    traverseTo("");
    expect(result.current.screen).toBe("start");

    traverseTo("#game");
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });

    expect(result.current.screen).toBe("start");
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("does not ask once the game is over", () => {
    const confirm = stubConfirm(true);
    const { result } = renderAt("", true);
    act(() => {
      result.current.showGame();
    });

    traverseTo("");

    expect(confirm).not.toHaveBeenCalled();
    expect(result.current.screen).toBe("start");
  });

  it("does not ask on the menu or the guide", () => {
    const confirm = stubConfirm(true);
    const { result } = renderAt("#how-to-play");

    traverseTo("");
    expect(confirm).not.toHaveBeenCalled();

    act(() => {
      result.current.showGuide();
    });
    traverseTo("");

    expect(confirm).not.toHaveBeenCalled();
  });
});
