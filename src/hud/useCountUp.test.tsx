// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCountUp } from "./useCountUp";

afterEach(cleanup);

describe("useCountUp", () => {
  it("returns the initial target unchanged on first render", () => {
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("snaps instantly to a target lower than what is displayed", () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target),
      { initialProps: { target: 10 } },
    );
    expect(result.current).toBe(10);

    rerender({ target: 4 });

    expect(result.current).toBe(4);
  });
});
