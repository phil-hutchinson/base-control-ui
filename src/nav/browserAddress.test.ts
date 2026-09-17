// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  currentHash,
  goBack,
  pushHash,
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
