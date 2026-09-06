import { describe, expect, it } from "vitest";
import { gaugeSlots } from "./powerGauge";
import { GAUGE_SLOT_COUNT } from "./shipArt";

describe("gaugeSlots", () => {
  it("always returns six slots", () => {
    for (const power of [0, 1, 2, 3, 4, 5, 6] as const) {
      expect(gaugeSlots(power)).toHaveLength(GAUGE_SLOT_COUNT);
    }
  });

  it("lights none at 0 power", () => {
    expect(gaugeSlots(0)).toEqual([
      { index: 0, lit: false },
      { index: 1, lit: false },
      { index: 2, lit: false },
      { index: 3, lit: false },
      { index: 4, lit: false },
      { index: 5, lit: false },
    ]);
  });

  it("lights only the first slot at 1 power", () => {
    expect(gaugeSlots(1)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: false },
      { index: 2, lit: false },
      { index: 3, lit: false },
      { index: 4, lit: false },
      { index: 5, lit: false },
    ]);
  });

  it("lights the first two slots at 2 power", () => {
    expect(gaugeSlots(2)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: false },
      { index: 3, lit: false },
      { index: 4, lit: false },
      { index: 5, lit: false },
    ]);
  });

  it("lights the first three slots at 3 power", () => {
    expect(gaugeSlots(3)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: false },
      { index: 4, lit: false },
      { index: 5, lit: false },
    ]);
  });

  it("lights the first four slots at 4 power", () => {
    expect(gaugeSlots(4)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: true },
      { index: 4, lit: false },
      { index: 5, lit: false },
    ]);
  });

  it("lights the first five slots at 5 power", () => {
    expect(gaugeSlots(5)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: true },
      { index: 4, lit: true },
      { index: 5, lit: false },
    ]);
  });

  it("lights all six slots at 6 power", () => {
    expect(gaugeSlots(6)).toEqual([
      { index: 0, lit: true },
      { index: 1, lit: true },
      { index: 2, lit: true },
      { index: 3, lit: true },
      { index: 4, lit: true },
      { index: 5, lit: true },
    ]);
  });
});
