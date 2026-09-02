import { describe, expect, it } from "vitest";
import {
  CLOCK_READING_TENTHS_THRESHOLD_MS,
  formatClockReading,
} from "./clockReading";

describe("formatClockReading", () => {
  it("reads INF for an infinite remaining duration", () => {
    expect(formatClockReading(Number.POSITIVE_INFINITY)).toBe("INF");
  });

  describe("above fifteen seconds: m:ss, rounded up", () => {
    it("180 000 ms reads 3:00", () => {
      expect(formatClockReading(180_000)).toBe("3:00");
    });

    it("179 400 ms still reads 3:00", () => {
      expect(formatClockReading(179_400)).toBe("3:00");
    });

    it("179 000 ms is the exact instant the reading becomes 2:59", () => {
      expect(formatClockReading(179_000)).toBe("2:59");
    });

    it("178 999 ms reads 2:59", () => {
      expect(formatClockReading(178_999)).toBe("2:59");
    });

    it("15 001 ms reads 0:16", () => {
      expect(formatClockReading(15_001)).toBe("0:16");
    });
  });

  describe("the handover at fifteen seconds is continuous", () => {
    it("15 000 ms — the threshold itself — reads 15.0, not 0:15", () => {
      expect(formatClockReading(15_000)).toBe("15.0");
      expect(formatClockReading(CLOCK_READING_TENTHS_THRESHOLD_MS)).toBe(
        "15.0",
      );
    });

    it("14 999 ms also reads 15.0, so no reading is skipped", () => {
      expect(formatClockReading(14_999)).toBe("15.0");
    });
  });

  describe("fifteen seconds and below: seconds and tenths, rounded up", () => {
    it("14 900 ms reads 14.9", () => {
      expect(formatClockReading(14_900)).toBe("14.9");
    });

    it("100 ms reads 0.1", () => {
      expect(formatClockReading(100)).toBe("0.1");
    });

    it("1 ms reads 0.1", () => {
      expect(formatClockReading(1)).toBe("0.1");
    });

    it("0 ms reads 0.0", () => {
      expect(formatClockReading(0)).toBe("0.0");
    });

    it("a negative value reads 0.0", () => {
      expect(formatClockReading(-500)).toBe("0.0");
    });
  });

  describe("the story's example budgets", () => {
    it("a ninety-round game at 6s a turn reads 9:00 at full budget", () => {
      expect(formatClockReading(540_000)).toBe("9:00");
    });

    it("a thirty-round game at 2s a turn reads 1:00 at full budget", () => {
      expect(formatClockReading(60_000)).toBe("1:00");
    });
  });
});
