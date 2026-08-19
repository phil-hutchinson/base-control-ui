import { describe, expect, it } from "vitest";
import { COUNT_UP_DURATION_MS, countUpValue } from "./countUp";

describe("countUpValue", () => {
  it("is partway between from and to at the midpoint", () => {
    expect(countUpValue(0, 10, COUNT_UP_DURATION_MS / 2)).toBe(5);
  });

  it("settles exactly on the target at the duration", () => {
    expect(countUpValue(0, 24, COUNT_UP_DURATION_MS)).toBe(24);
  });

  it("stays exactly on the target past the duration", () => {
    expect(countUpValue(0, 24, COUNT_UP_DURATION_MS * 10)).toBe(24);
  });

  it("counts down towards a target below the start", () => {
    expect(countUpValue(10, 0, COUNT_UP_DURATION_MS / 2)).toBe(5);
    expect(countUpValue(10, 0, COUNT_UP_DURATION_MS)).toBe(0);
  });

  it("is the target immediately when there is no change to make", () => {
    expect(countUpValue(24, 24, 0)).toBe(24);
  });

  it("never overshoots the target in either direction", () => {
    for (let elapsed = 0; elapsed <= COUNT_UP_DURATION_MS; elapsed += 37) {
      const up = countUpValue(0, 10, elapsed);
      expect(up).toBeGreaterThanOrEqual(0);
      expect(up).toBeLessThanOrEqual(10);

      const down = countUpValue(10, 0, elapsed);
      expect(down).toBeGreaterThanOrEqual(0);
      expect(down).toBeLessThanOrEqual(10);
    }
  });
});
