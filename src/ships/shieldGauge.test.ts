import { describe, expect, it } from "vitest";
import { GAUGE_SLOT_COUNT } from "./shipArt";
import { gaugeSlots } from "./shieldGauge";

describe("gaugeSlots", () => {
  it("always returns four slots", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      expect(gaugeSlots(shields)).toHaveLength(GAUGE_SLOT_COUNT);
    }
  });

  it("lights none at 0 shields", () => {
    expect(gaugeSlots(0)).toEqual([
      { index: 0, lit: false },
      { index: 1, lit: false },
      { index: 2, lit: false },
      { index: 3, lit: false },
    ]);
  });

  it("lights only the first slot at 1 shield", () => {
    expect(gaugeSlots(1)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: false },
      { index: 2, lit: false },
      { index: 3, lit: false },
    ]);
  });

  it("lights the first two slots at 2 shields", () => {
    expect(gaugeSlots(2)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: false },
      { index: 3, lit: false },
    ]);
  });

  it("lights the first three slots at 3 shields", () => {
    expect(gaugeSlots(3)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: false },
    ]);
  });

  it("lights all four slots at 4 shields", () => {
    expect(gaugeSlots(4)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: true },
    ]);
  });
});
