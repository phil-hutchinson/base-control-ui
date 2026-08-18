import { describe, expect, it } from "vitest";
import { drawIndex, mulberry32 } from "./random";

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
