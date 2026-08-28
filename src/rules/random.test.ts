import { describe, expect, it } from "vitest";
import { drawIndex, drawWeightedIndex, mulberry32 } from "./random";

describe("mulberry32", () => {
  it("is deterministic: the same seed always produces the same pair", () => {
    expect(mulberry32(1)).toEqual(mulberry32(1));
    expect(mulberry32(123456789)).toEqual(mulberry32(123456789));
  });

  it("agrees across two independent walks from the same seed", () => {
    const walk = (seed: number) => {
      const values: number[] = [];
      let current = seed;
      for (let i = 0; i < 10; i++) {
        const [value, nextSeed] = mulberry32(current);
        values.push(value);
        current = nextSeed;
      }
      return values;
    };

    expect(walk(7)).toEqual(walk(7));
  });

  it("matches a golden sequence recorded from the implementation", () => {
    // Locks the generator's output so a recorded game replays exactly and a
    // later refactor cannot silently change it.
    let seed = 42;
    const pairs: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const pair = mulberry32(seed);
      pairs.push(pair);
      seed = pair[1];
    }

    expect(pairs).toEqual([
      [0.6011037519201636, 1831565855],
      [0.44829055899754167, 3663131668],
      [0.8524657934904099, 1199730185],
      [0.6697340414393693, 3031295998],
      [0.17481389874592423, 567894515],
    ]);
  });

  it("stays in range over a few thousand steps", () => {
    let seed = 987654321;
    for (let i = 0; i < 5000; i++) {
      const [value, nextSeed] = mulberry32(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(Number.isInteger(nextSeed)).toBe(true);
      expect(nextSeed).toBeGreaterThanOrEqual(0);
      expect(nextSeed).toBeLessThan(2 ** 32);
      seed = nextSeed;
    }
  });
});

describe("drawIndex", () => {
  it("draws indices uniformly enough over a realistic pool size", () => {
    const buckets = 7;
    const samples = 70000;
    const counts = new Array<number>(buckets).fill(0);

    let seed = 24601;
    for (let i = 0; i < samples; i++) {
      const [index, nextSeed] = drawIndex(seed, buckets);
      counts[index]++;
      seed = nextSeed;
    }

    const expected = samples / buckets;
    for (const count of counts) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });

  it("stays within bounds", () => {
    let seed = 314159;
    for (let i = 0; i < 2000; i++) {
      const [index, nextSeed] = drawIndex(seed, 17);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(17);
      expect(Number.isInteger(index)).toBe(true);
      seed = nextSeed;
    }
  });

  it("always returns 0 for a count of 1", () => {
    let seed = 1;
    for (let i = 0; i < 20; i++) {
      const [index, nextSeed] = drawIndex(seed, 1);
      expect(index).toBe(0);
      seed = nextSeed;
    }
  });

  it("throws a RangeError for a count of 0", () => {
    expect(() => drawIndex(1, 0)).toThrow(RangeError);
  });

  it("throws a RangeError for a negative count", () => {
    expect(() => drawIndex(1, -3)).toThrow(RangeError);
  });

  it("throws a RangeError for a fractional count", () => {
    expect(() => drawIndex(1, 2.5)).toThrow(RangeError);
  });
});

describe("drawWeightedIndex", () => {
  it("is deterministic: the same seed and weights give the same result", () => {
    expect(drawWeightedIndex(24601, [1, 2, 3])).toEqual(
      drawWeightedIndex(24601, [1, 2, 3]),
    );
  });

  it("advances the seed exactly once, the same way mulberry32 alone would", () => {
    const [, expectedNextSeed] = mulberry32(24601);
    const [, nextSeed] = drawWeightedIndex(24601, [1, 2, 3]);
    expect(nextSeed).toBe(expectedNextSeed);
  });

  it("draws each index in proportion to its share of the total weight", () => {
    const weights = [10, 20, 30, 40];
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const samples = 100000;
    const counts = new Array<number>(weights.length).fill(0);

    let seed = 24601;
    for (let i = 0; i < samples; i++) {
      const [index, nextSeed] = drawWeightedIndex(seed, weights);
      counts[index]++;
      seed = nextSeed;
    }

    for (let i = 0; i < weights.length; i++) {
      const expected = (samples * weights[i]) / total;
      expect(Math.abs(counts[i] - expected) / expected).toBeLessThan(0.05);
    }
  });

  it("always returns 0 for a single weight", () => {
    let seed = 1;
    for (let i = 0; i < 20; i++) {
      const [index, nextSeed] = drawWeightedIndex(seed, [7]);
      expect(index).toBe(0);
      seed = nextSeed;
    }
  });

  it("never draws a zero weight, splitting the rest proportionally", () => {
    const weights = [5, 0, 15];
    const samples = 50000;
    const counts = new Array<number>(weights.length).fill(0);

    let seed = 999;
    for (let i = 0; i < samples; i++) {
      const [index, nextSeed] = drawWeightedIndex(seed, weights);
      counts[index]++;
      seed = nextSeed;
    }

    expect(counts[1]).toBe(0);
    const expectedRatio = weights[0] / weights[2];
    const actualRatio = counts[0] / counts[2];
    expect(Math.abs(actualRatio - expectedRatio) / expectedRatio).toBeLessThan(
      0.05,
    );
  });

  it("throws a RangeError for an empty list", () => {
    expect(() => drawWeightedIndex(1, [])).toThrow(RangeError);
  });

  it("throws a RangeError for a negative weight", () => {
    expect(() => drawWeightedIndex(1, [1, -2, 3])).toThrow(RangeError);
  });

  it("throws a RangeError for a non-finite weight", () => {
    expect(() => drawWeightedIndex(1, [1, Infinity, 3])).toThrow(RangeError);
    expect(() => drawWeightedIndex(1, [1, NaN, 3])).toThrow(RangeError);
  });

  it("throws a RangeError for an all-zero list", () => {
    expect(() => drawWeightedIndex(1, [0, 0, 0])).toThrow(RangeError);
  });

  it("always returns an in-range index across a large sweep of seeds", () => {
    const weights = [1, 0.001, 1000];
    let seed = 271828;
    for (let i = 0; i < 20000; i++) {
      const [index, nextSeed] = drawWeightedIndex(seed, weights);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(weights.length);
      expect(Number.isInteger(index)).toBe(true);
      seed = nextSeed;
    }
  });
});
