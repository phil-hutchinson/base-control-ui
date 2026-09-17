// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  currentHash,
  goBack,
  pushHash,
  registerAddressGuard,
  replaceHash,
  subscribeToAddress,
} from "./browserAddress";

// jsdom keeps one location for the whole file, so a test that left a fragment
// behind would decide what the next test starts from.
function resetAddress() {
  window.history.replaceState(null, "", "/");
}

beforeEach(resetAddress);
afterEach(resetAddress);

/** A traversal as the browser performs one: the address moves, then the event. */
function traverseTo(hash: string) {
  window.history.replaceState(null, "", `/${hash}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

describe("pushHash", () => {
  it("shows the fragment, adds an entry, and tells every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeToAddress(first);
    const unsubscribeSecond = subscribeToAddress(second);
    const entriesBefore = window.history.length;

    pushHash("#game");

    expect(currentHash()).toBe("#game");
    expect(window.history.length).toBe(entriesBefore + 1);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    unsubscribeFirst();
    unsubscribeSecond();
  });
});

describe("replaceHash", () => {
  it("shows the fragment and tells the subscribers without adding an entry", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAddress(listener);
    const entriesBefore = window.history.length;

    replaceHash("#how-to-play");

    expect(currentHash()).toBe("#how-to-play");
    expect(window.history.length).toBe(entriesBefore);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
  });

  it("clears a fragment that is already there", () => {
    replaceHash("#game");

    replaceHash("");

    expect(currentHash()).toBe("");
  });
});

describe("the address the app writes", () => {
  it("keeps the path and the query, so a build in a subfolder stays there", () => {
    window.history.replaceState(null, "", "/builds/v1/?x=1#game");

    pushHash("");

    expect(window.location.pathname).toBe("/builds/v1/");
    expect(window.location.search).toBe("?x=1");
    expect(currentHash()).toBe("");
  });
});

describe("subscribeToAddress", () => {
  it("hears a traversal and a fragment jump", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAddress(listener);

    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(listener).toHaveBeenCalledOnce();

    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("stops telling a listener that has unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAddress(listener);

    unsubscribe();
    pushHash("#game");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("goBack", () => {
  it("returns to the previous address and tells the subscribers", async () => {
    pushHash("#game");
    const listener = vi.fn();
    const unsubscribe = subscribeToAddress(listener);

    goBack();

    await waitFor(() => {
      expect(currentHash()).toBe("");
    });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});

describe("registerAddressGuard", () => {
  it("runs a guard before any subscriber hears about a change", () => {
    const order: string[] = [];
    const unregister = registerAddressGuard(() => order.push("guard"));
    const unsubscribe = subscribeToAddress(() => order.push("subscriber"));

    try {
      traverseTo("#game");

      expect(order).toEqual(["guard", "subscriber"]);
    } finally {
      unregister();
      unsubscribe();
    }
  });

  it("runs a guard even when reacting to the change unregisters it", () => {
    // What React does on a traversal: the subscription re-renders, and the
    // effect cleanup that follows tears the guard down. A guard that was its
    // own DOM listener would be skipped for this very event, because a
    // listener removed mid-dispatch is never invoked.
    const guard = vi.fn();
    const unregister = registerAddressGuard(guard);
    const unsubscribe = subscribeToAddress(() => unregister());

    try {
      traverseTo("#game");

      expect(guard).toHaveBeenCalledOnce();
    } finally {
      unregister();
      unsubscribe();
    }
  });

  it("is not run by the app's own pushes and replaces", () => {
    const guard = vi.fn();
    const unregister = registerAddressGuard(guard);

    try {
      pushHash("#game");
      replaceHash("");

      expect(guard).not.toHaveBeenCalled();
    } finally {
      unregister();
    }
  });

  it("stops running once unregistered", () => {
    const guard = vi.fn();
    const unregister = registerAddressGuard(guard);

    unregister();
    traverseTo("#game");

    expect(guard).not.toHaveBeenCalled();
  });
});

describe("one change, one guard run", () => {
  it("asks once when a traversal fires both popstate and hashchange", () => {
    // Firefox fires both for one Back press, and the two arrive in a
    // different order than in Chrome. Either way the guard sees one change.
    const guard = vi.fn();
    const unregister = registerAddressGuard(guard);

    traverseTo("#game");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(guard).toHaveBeenCalledOnce();

    unregister();
  });

  it("asks again the next time the address really moves", () => {
    const guard = vi.fn();
    const unregister = registerAddressGuard(guard);

    traverseTo("#game");
    traverseTo("");

    expect(guard).toHaveBeenCalledTimes(2);

    unregister();
  });

  it("still tells subscribers about every event, whether or not it guarded", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAddress(listener);

    traverseTo("#game");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
