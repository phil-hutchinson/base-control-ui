import { describe, expect, it } from "vitest";
import { PLANETS, isPlanet } from "./planets";
import { COLUMN_LETTERS, type Square, squareAt, squareName } from "./board";

/** The named twelve, in the order rules.md §3.1 gives the six base squares and their rotations. */
const EXPECTED_PLANET_NAMES = [
  "E3",
  "D7",
  "F5",
  "I4",
  "J8",
  "L5",
  "K13",
  "L9",
  "J11",
  "G12",
  "F8",
  "D11",
];

/** The square a half-turn rotation of the board sends `square` to, computed independently of `planets.ts`'s own rotation. */
function rotateHalfTurn(square: Square): Square {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const rotatedColumn = COLUMN_LETTERS[COLUMN_LETTERS.length - 1 - columnIndex];
  return squareAt(rotatedColumn, 16 - square.row);
}

/** Whether two squares are orthogonally or diagonally adjacent. */
function isAdjacent(a: Square, b: Square): boolean {
  const columnDelta =
    COLUMN_LETTERS.indexOf(a.column) - COLUMN_LETTERS.indexOf(b.column);
  return Math.abs(columnDelta) <= 1 && Math.abs(a.row - b.row) <= 1;
}

describe("planets", () => {
  it("has exactly twelve planets", () => {
    expect(PLANETS).toHaveLength(12);
  });

  it("is exactly the named twelve squares", () => {
    expect(PLANETS.map(squareName).sort()).toEqual(
      [...EXPECTED_PLANET_NAMES].sort(),
    );
  });

  it("is unchanged by a half-turn rotation", () => {
    const names = new Set(PLANETS.map(squareName));
    for (const planet of PLANETS) {
      expect(names.has(squareName(rotateHalfTurn(planet)))).toBe(true);
    }
  });

  it("has no two planets adjacent, orthogonally or diagonally", () => {
    for (let a = 0; a < PLANETS.length; a++) {
      for (let b = a + 1; b < PLANETS.length; b++) {
        expect(isAdjacent(PLANETS[a], PLANETS[b])).toBe(false);
      }
    }
  });

  it("lies entirely inside C3-M13, the interior the node draw uses", () => {
    for (const planet of PLANETS) {
      const columnIndex = COLUMN_LETTERS.indexOf(planet.column);
      expect(columnIndex).toBeGreaterThanOrEqual(COLUMN_LETTERS.indexOf("C"));
      expect(columnIndex).toBeLessThanOrEqual(COLUMN_LETTERS.indexOf("M"));
      expect(planet.row).toBeGreaterThanOrEqual(3);
      expect(planet.row).toBeLessThanOrEqual(13);
    }
  });

  it("matches isPlanet for every planet and rejects a sample of non-planet squares", () => {
    for (const planet of PLANETS) {
      expect(isPlanet(planet)).toBe(true);
    }
    expect(isPlanet(squareAt("A", 1))).toBe(false);
    expect(isPlanet(squareAt("H", 8))).toBe(false);
    // A starting square, which is now an ordinary square.
    expect(isPlanet(squareAt("A", 2))).toBe(false);
  });
});
