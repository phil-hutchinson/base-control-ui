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
import {
  drawNodeSquare,
  drawUniformSquare,
  drawWeightedNodeSquare,
  legalNodePool,
} from "./nodePlacement";
import { drawWeightedIndex, mulberry32 } from "./random";

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
 * than typed out, so the set follows the geometry — this restates §3.2's
 * rule, not `legalNodePool`'s implementation of it.
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
  it("is exactly the 51 legal squares on an empty board", () => {
    const pool = legalNodePool([], []);

    expect(pool).toHaveLength(51);
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
    // elsewhere (nodes.test.ts, nodePool.test.ts); this test covers only
    // which squares the fallback pool contains.
  });

  it("lets the fallback include a square adjacent to a planet, which the ordinary pool never would", () => {
    // Occupying exactly the 51 ordinarily-legal squares leaves no square
    // that can pass every one of the six ordinary constraints, so the
    // fallback fires. E5 is not itself one of the 51 — it borders the
    // planet D6 — and is not a node here, so it shows up in the fallback,
    // pinning that the fallback's relaxation really does admit a
    // planet-adjacent square rather than merely planets themselves.
    const target = squareAt("E", 5);
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

describe("legalNodePool with the widened pool", () => {
  it("is 79 squares on an empty board, a strict superset of the 51-square strict pool", () => {
    const strict = legalNodePool([], []);
    const widened = legalNodePool([], [], undefined, "widened");

    expect(strict).toHaveLength(51);
    expect(widened).toHaveLength(79);

    const strictNames = new Set(strict.map(squareName));
    const widenedNames = new Set(widened.map(squareName));
    for (const name of strictNames) {
      expect(widenedNames.has(name)).toBe(true);
    }
  });

  it("contains a square one ring in from the edge that the strict pool excludes", () => {
    // B8 is one square in from the edge, not a planet and not adjacent to one.
    const target = squareAt("B", 8);
    const strict = legalNodePool([], []);
    const widened = legalNodePool([], [], undefined, "widened");

    expect(strict.map(squareName)).not.toContain(squareName(target));
    expect(widened.map(squareName)).toContain(squareName(target));
  });

  it("never includes a square on the outer edge, in either pool", () => {
    const strict = legalNodePool([], []);
    const widened = legalNodePool([], [], undefined, "widened");

    for (const pool of [strict, widened]) {
      for (const square of pool) {
        expect(square.row).not.toBe(1);
        expect(square.row).not.toBe(15);
        expect(square.column).not.toBe("A");
        expect(square.column).not.toBe("O");
      }
    }
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

describe("drawUniformSquare", () => {
  it("returns a member of the given pool and advances the seed exactly once", () => {
    const pool = legalNodePool([], []);
    const [, expectedNextSeed] = mulberry32(7);
    const [square, nextSeed] = drawUniformSquare(pool, 7);

    expect(pool.map(squareName)).toContain(squareName(square));
    expect(nextSeed).toBe(expectedNextSeed);
  });

  it("returns the same square and seed for the same inputs", () => {
    const pool = [squareAt("C", 3), squareAt("D", 4), squareAt("E", 5)];

    expect(drawUniformSquare(pool, 42)).toEqual(drawUniformSquare(pool, 42));
  });
});

describe("drawWeightedNodeSquare", () => {
  it("advances the seed exactly once", () => {
    const pool = [squareAt("C", 3), squareAt("D", 4)];
    const [, expectedNextSeed] = mulberry32(123);
    const [, nextSeed] = drawWeightedNodeSquare(pool, [], [], 123);

    expect(nextSeed).toBe(expectedNextSeed);
  });

  it("returns the same square and seed for the same inputs", () => {
    const pool = [squareAt("C", 3), squareAt("D", 4), squareAt("J", 10)];
    const charged = [squareAt("H", 8)];
    const placed = [squareAt("E", 5)];

    expect(drawWeightedNodeSquare(pool, charged, placed, 55)).toEqual(
      drawWeightedNodeSquare(pool, charged, placed, 55),
    );
  });

  it("is uniform with no charged nodes and no already-placed nodes", () => {
    const pool = [squareAt("C", 3), squareAt("F", 6), squareAt("J", 10)];
    const counts = pool.map(() => 0);
    const trials = 6000;
    let seed = 1;

    for (let i = 0; i < trials; i++) {
      const [square, nextSeed] = drawWeightedNodeSquare(pool, [], [], seed);
      seed = nextSeed;
      const index = pool.findIndex(
        (candidate) => squareName(candidate) === squareName(square),
      );
      counts[index] += 1;
    }

    for (const count of counts) {
      expect(count / trials).toBeGreaterThan(0.3);
      expect(count / trials).toBeLessThan(0.37);
    }
  });

  it("with one charged node, picks a far square far more often than a near one, at the formula's ratio", () => {
    const charged = [squareAt("H", 8)];
    const near = squareAt("H", 9); // d = 1, weight = 1 + 1*1 = 2
    const far = squareAt("A", 1); // d = 7, weight = 1 + 7*1 = 8
    const pool = [near, far];
    // Expected share: near 2/10 = 0.2, far 8/10 = 0.8.
    let nearCount = 0;
    let farCount = 0;
    const trials = 6000;
    let seed = 2;

    for (let i = 0; i < trials; i++) {
      const [square, nextSeed] = drawWeightedNodeSquare(
        pool,
        charged,
        [],
        seed,
      );
      seed = nextSeed;
      if (squareName(square) === squareName(near)) {
        nearCount += 1;
      } else {
        farCount += 1;
      }
    }

    expect(nearCount + farCount).toBe(trials);
    expect(nearCount / trials).toBeGreaterThan(0.12);
    expect(nearCount / trials).toBeLessThan(0.28);
    expect(farCount / trials).toBeGreaterThan(0.72);
    expect(farCount / trials).toBeLessThan(0.88);
  });

  it("collapses the weight of a square near an already-placed node, matching the formula exactly", () => {
    const charged = [squareAt("H", 8)];
    const placed = [squareAt("C", 3)];
    // D4: d(D4, H8) = max(4, 4) = 4; d(D4, C3) = max(1, 1) = 1.
    // weight(D4) = 1 + 4 * 1 = 5.
    const nearPlaced = squareAt("D", 4);
    // N13: d(N13, H8) = max(6, 5) = 6; d(N13, C3) = max(11, 10) = 11.
    // weight(N13) = 1 + 6 * 11 = 67.
    const farFromPlaced = squareAt("N", 13);
    const pool = [nearPlaced, farFromPlaced];
    const expectedWeights = [5, 67];

    for (const seed of [999, 12345, 0, 42]) {
      const [expectedIndex, expectedNextSeed] = drawWeightedIndex(
        seed,
        expectedWeights,
      );
      const [square, nextSeed] = drawWeightedNodeSquare(
        pool,
        charged,
        placed,
        seed,
      );

      expect(squareName(square)).toBe(squareName(pool[expectedIndex]));
      expect(nextSeed).toBe(expectedNextSeed);
    }
  });
});
