import { describe, expect, it } from "vitest";
import { PLANETS, isPlanet } from "./planets";
import {
  ALL_SQUARES,
  COLUMN_LETTERS,
  type Square,
  squareAt,
  squareName,
} from "./board";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
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

/**
 * The squares that satisfy all six of §3.2's constraints on an empty board
 * with no ships: the interior, minus the twelve planets and every square
 * orthogonally or diagonally adjacent to one. Derived from `PLANETS` rather
 * than typed out, because the planet geometry is still being moved around —
 * this restates §3.2's rule, not `legalNodePool`'s implementation of it.
 */
const LEGAL_SQUARES_ON_EMPTY_BOARD: readonly Square[] =
  interiorSquares().filter(
    (square) =>
      !PLANETS.some(
        (planet) =>
          Math.abs(
            COLUMN_LETTERS.indexOf(planet.column) -
              COLUMN_LETTERS.indexOf(square.column),
          ) <= 1 && Math.abs(planet.row - square.row) <= 1,
      ),
  );

/** Whether two squares are orthogonally or diagonally adjacent. */
function isAdjacent(a: Square, b: Square): boolean {
  const columnDelta =
    COLUMN_LETTERS.indexOf(a.column) - COLUMN_LETTERS.indexOf(b.column);
  return Math.abs(columnDelta) <= 1 && Math.abs(a.row - b.row) <= 1;
}

describe("legalNodePool", () => {
  it("is exactly the 29 legal squares on an empty board", () => {
    const pool = legalNodePool([], []);

    expect(pool.map(squareName).sort()).toEqual(
      LEGAL_SQUARES_ON_EMPTY_BOARD.map(squareName).sort(),
    );
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

  it("excludes every planet, and every square orthogonally or diagonally adjacent to one", () => {
    const pool = legalNodePool([], []);

    for (const square of pool) {
      expect(isPlanet(square)).toBe(false);
      for (const planet of PLANETS) {
        expect(isAdjacent(square, planet)).toBe(false);
      }
    }
  });

  it("stays non-empty for a realistic mid-game board of ships and nodes", () => {
    const shipSquares = startingFleet(DEFAULT_FLEET_SIZE).map(
      (entry) => entry.square,
    );
    const nodeSquares = LEGAL_SQUARES_ON_EMPTY_BOARD.slice(0, 4);

    const pool = legalNodePool(nodeSquares, shipSquares);

    expect(pool.length).toBeGreaterThan(0);
  });

  it("falls back to every non-planet, unoccupied square when the ordinary pool is empty, dropping the ship and ring constraints", () => {
    // A node on every one of the 121 interior squares leaves no square
    // satisfying all six constraints, so the fallback must fire.
    const nodes = interiorSquares();
    const nodeNames = new Set(nodes.map(squareName));
    // A ship standing on a non-planet square outside the interior — under
    // the ordinary constraints this square would be doubly excluded (a ship
    // on it, and it is one square in from the edge), so its presence in the
    // fallback pool shows the fallback really drops those constraints
    // rather than just having room left over from the node exclusion.
    const shipSquare = squareAt("B", 8);
    const pool = legalNodePool(nodes, [shipSquare]);

    expect(pool.length).toBeGreaterThan(0);
    for (const square of pool) {
      expect(nodeNames.has(squareName(square))).toBe(false);
      expect(isPlanet(square)).toBe(false);
    }
    expect(pool.map(squareName)).toContain(squareName(shipSquare));
    // The draw's uniformity over the pool is covered by the spread tests
    // elsewhere (nodes.test.ts, nodePool.test.ts); this test is base cover
    // only, per the owner.
  });

  it("lets the fallback include a square adjacent to a planet, which the ordinary pool never would (D8)", () => {
    // Occupying exactly the 29 ordinarily-legal squares leaves no square
    // that can pass every one of the six ordinary constraints, so the
    // fallback fires. D8 is not itself one of the 29 — it borders the
    // planet D7 — and is not a node here, so it shows up in the fallback,
    // pinning that the fallback's relaxation really does admit a
    // planet-adjacent square rather than merely planets themselves.
    const target = squareAt("D", 8);
    expect(isPlanet(target)).toBe(false);
    expect(
      LEGAL_SQUARES_ON_EMPTY_BOARD.some(
        (square) => squareName(square) === squareName(target),
      ),
    ).toBe(false);

    const pool = legalNodePool(LEGAL_SQUARES_ON_EMPTY_BOARD, []);

    expect(pool.map(squareName)).toContain(squareName(target));
  });

  it("throws a RangeError when even the fallback pool is empty", () => {
    const nonPlanetSquares = ALL_SQUARES.filter((square) => !isPlanet(square));

    expect(() => legalNodePool(nonPlanetSquares, [])).toThrow(RangeError);
  });

  it("deals and replaces nodes for many rounds without ever throwing", () => {
    let seed = 20260905;
    let occupied: readonly Square[] = [];

    for (let i = 0; i < 12; i++) {
      const [square, nextSeed] = drawNodeSquare(occupied, [], seed);
      seed = nextSeed;
      occupied = [...occupied, square];
    }

    for (let round = 0; round < 500; round++) {
      const retiring = occupied[round % occupied.length];
      const remaining = occupied.filter(
        (square) => squareName(square) !== squareName(retiring),
      );
      const [square, nextSeed] = drawNodeSquare(remaining, [], seed, retiring);
      seed = nextSeed;
      occupied = [...remaining, square];
    }

    expect(occupied).toHaveLength(12);
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
