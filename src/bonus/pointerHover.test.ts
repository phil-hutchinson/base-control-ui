import { describe, expect, it } from "vitest";
import { isTouchPointer } from "./pointerHover";

/** A minimal stand-in for React's `PointerEvent`, carrying only what
 * `isTouchPointer` reads. */
function pointerEvent(pointerType?: string) {
  return { pointerType } as Parameters<typeof isTouchPointer>[0];
}

describe("isTouchPointer", () => {
  it("is true for a touch pointer", () => {
    expect(isTouchPointer(pointerEvent("touch"))).toBe(true);
  });

  it("is false for a mouse pointer", () => {
    expect(isTouchPointer(pointerEvent("mouse"))).toBe(false);
  });

  it("is false for a pen pointer, which stays a hover affordance", () => {
    expect(isTouchPointer(pointerEvent("pen"))).toBe(false);
  });

  it("is false when pointerType is missing, as in jsdom's synthetic events", () => {
    expect(isTouchPointer(pointerEvent(undefined))).toBe(false);
  });
});
