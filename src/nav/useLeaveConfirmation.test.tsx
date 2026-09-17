// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLeaveConfirmation } from "./useLeaveConfirmation";

// Vitest's globals are off (see vite.config.ts), so Testing Library's
// automatic cleanup never registers itself.
afterEach(cleanup);

/** Dispatches a cancelable `beforeunload` and reports whether it was cancelled. */
function dispatchBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  const notCancelled = window.dispatchEvent(event);
  return { notCancelled, defaultPrevented: event.defaultPrevented };
}

describe("useLeaveConfirmation", () => {
  it("cancels beforeunload while enabled", () => {
    renderHook(() => useLeaveConfirmation(true));

    const { notCancelled, defaultPrevented } = dispatchBeforeUnload();

    expect(notCancelled).toBe(false);
    expect(defaultPrevented).toBe(true);
  });

  it("does not cancel beforeunload while disabled", () => {
    renderHook(() => useLeaveConfirmation(false));

    const { notCancelled, defaultPrevented } = dispatchBeforeUnload();

    expect(notCancelled).toBe(true);
    expect(defaultPrevented).toBe(false);
  });

  it("does not cancel beforeunload once unmounted", () => {
    const { unmount } = renderHook(() => useLeaveConfirmation(true));
    unmount();

    const { notCancelled, defaultPrevented } = dispatchBeforeUnload();

    expect(notCancelled).toBe(true);
    expect(defaultPrevented).toBe(false);
  });
});
