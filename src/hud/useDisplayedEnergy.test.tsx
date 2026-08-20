// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EnergyTotals } from "../rules/gameState";
import { useDisplayedEnergy } from "./useDisplayedEnergy";

afterEach(cleanup);

describe("useDisplayedEnergy", () => {
  it("returns the targets unchanged and settled on a fresh render", () => {
    const { result } = renderHook(() =>
      useDisplayedEnergy({ green: 4, red: 1 }),
    );

    expect(result.current.displayed).toEqual({ green: 4, red: 1 });
    expect(result.current.settled).toBe(true);
  });

  it("leaves settled false with the old value still displayed right after a target rises, then settles on the new target", async () => {
    const { result, rerender } = renderHook(
      ({ energy }: { energy: EnergyTotals }) => useDisplayedEnergy(energy),
      { initialProps: { energy: { green: 4, red: 1 } } },
    );

    rerender({ energy: { green: 7, red: 1 } });

    expect(result.current.displayed).toEqual({ green: 4, red: 1 });
    expect(result.current.settled).toBe(false);

    await waitFor(
      () => {
        expect(result.current.displayed).toEqual({ green: 7, red: 1 });
        expect(result.current.settled).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("snaps instantly and stays settled when a target falls", () => {
    const { result, rerender } = renderHook(
      ({ energy }: { energy: EnergyTotals }) => useDisplayedEnergy(energy),
      { initialProps: { energy: { green: 10, red: 5 } } },
    );

    rerender({ energy: { green: 3, red: 5 } });

    expect(result.current.displayed).toEqual({ green: 3, red: 5 });
    expect(result.current.settled).toBe(true);
  });
});
