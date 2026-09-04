import { describe, expect, it } from "vitest";
import { isBay } from "./bays";
import { ALL_SQUARES, type Square, squareAt, squareName } from "./board";
import { drawNodeSquare, legalNodePool } from "./nodePlacement";
import { mulberry32 } from "./random";

/** The 121 squares C3-M13, in board order — the interior §3.2's two ring exclusions leave. */
function interiorSquares(): Square[] {
  const columns = "CDEFGHIJKLM".split("") as Square["column"][];
  const squares: Square[] = [];
  for (let row = 3; row <= 13; row++) {
    for (const column of columns) {
      squares.push(squareAt(column, row));
    }
  }
  return squares;
}

describe("legalNodePool", () => {
  it("is exactly the 121 squares C3-M13 on an empty board", () => {
    const pool = legalNodePool([], []);

    expect(pool.map(squareName)).toEqual(interiorSquares().map(squareName));
  });

  it("is in board order", () => {
    const nodes = [squareAt("K", 10), squareAt("D", 4)];
    const pool = legalNodePool(nodes, []);

    const boardOrderIndex = new Map(
      ALL_SQUARES.map((square, index) => [squareName(square), index]),
    );
    const indices = pool.map((square) =>
      boardOrderIndex.get(squareName(square))!,
    );
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("excludes a square that already holds a node", () => {
    const target = squareAt("H", 8);
    const pool = legalNodePool([target], []);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes a square a ship is standing on", () => {
    const target = squareAt("H", 8);
    const pool = legalNodePool([], [target]);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes a square on the outer edge", () => {
    const target = squareAt("A", 8);
    const pool = legalNodePool([], []);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes a square one square in from the edge", () => {
    const target = squareAt("B", 8);
    const pool = legalNodePool([], []);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes a square orthogonally adjacent to a node", () => {
    const node = squareAt("H", 8);
    const target = squareAt("H", 9);
    const pool = legalNodePool([node], []);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes a square diagonally adjacent to a node", () => {
    const node = squareAt("H", 8);
    const target = squareAt("I", 9);
    const pool = legalNodePool([node], []);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes the given square to exclude", () => {
    const target = squareAt("H", 8);
    const pool = legalNodePool([], [], target);

    expect(pool.map(squareName)).not.toContain(squareName(target));
  });

  it("excludes the given square to exclude from the fallback pool too", () => {
    const excluded = squareAt("H", 8);
    const pool = legalNodePool(interiorSquares(), [], excluded);

    expect(pool.map(squareName)).not.toContain(squareName(excluded));
  });

  it("falls back to every non-bay, unoccupied square when the ordinary pool is empty", () => {
    // A node on every one of the 121 interior squares leaves no square
    // satisfying all five constraints, so the fallback must fire.
    const nodes = interiorSquares();
    const nodeNames = new Set(nodes.map(squareName));
    const pool = legalNodePool(nodes, []);

    expect(pool.length).toBeGreaterThan(0);
    for (const square of pool) {
      expect(nodeNames.has(squareName(square))).toBe(false);
      expect(isBay(square)).toBe(false);
    }
  });

  it("throws a RangeError when even the fallback pool is empty", () => {
    const nonBaySquares = ALL_SQUARES.filter((square) => !isBay(square));

    expect(() => legalNodePool(nonBaySquares, [])).toThrow(RangeError);
  });
});

describe("drawNodeSquare", () => {
  it("returns a member of the pool and advances the seed exactly once", () => {
    const [, expectedNextSeed] = mulberry32(999);
    const [square, nextSeed] = drawNodeSquare([], [], 999);
    const pool = legalNodePool([], []);

    expect(pool.map(squareName)).toContain(squareName(square));
    expect(nextSeed).toBe(expectedNextSeed);
  });

  it("returns the same square and seed for the same inputs", () => {
    const first = drawNodeSquare([squareAt("H", 8)], [squareAt("D", 4)], 42);
    const second = drawNodeSquare([squareAt("H", 8)], [squareAt("D", 4)], 42);

    expect(first).toEqual(second);
  });

  it("never draws the excluded square", () => {
    for (let seed = 0; seed < 50; seed++) {
      const [square] = drawNodeSquare([], [], seed, squareAt("H", 8));
      expect(squareName(square)).not.toBe("H8");
    }
  });
});
