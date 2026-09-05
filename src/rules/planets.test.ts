import { describe, expect, it } from "vitest";
import { PLANETS, isPlanet } from "./planets";
import {
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";

/**
 * The 56 squares on the board's outer edge, in clockwise order starting at
 * the top-left corner (A15): along the top left to right, down the right
 * side, along the bottom right to left, and up the left side.
 */
function perimeterRing(): Square[] {
  const ring: Square[] = [];
  const columns = COLUMN_LETTERS;
  const last = columns.length - 1;

  for (const column of columns) {
    ring.push(squareAt(column, 15));
  }
  for (let row = 14; row >= 1; row--) {
    ring.push(squareAt(columns[last], row));
  }
  for (let index = last - 1; index >= 0; index--) {
    ring.push(squareAt(columns[index], 1));
  }
  for (let row = 2; row <= 14; row++) {
    ring.push(squareAt(columns[0], row));
  }

  return ring;
}

describe("planets", () => {
  it("has exactly fourteen planets", () => {
    expect(PLANETS).toHaveLength(14);
  });

  it("lies entirely on the outer edge", () => {
    for (const planet of PLANETS) {
      const onEdge =
        planet.column === "A" ||
        planet.column === "O" ||
        planet.row === 1 ||
        planet.row === 15;
      expect(onEdge).toBe(true);
    }
  });

  it("contains no corner", () => {
    const corners = new Set(["A1", "A15", "O1", "O15"]);
    for (const planet of PLANETS) {
      expect(corners.has(squareName(planet))).toBe(false);
    }
  });

  it("has every planet on the board", () => {
    for (const planet of PLANETS) {
      expect(isOnBoard(planet.column, planet.row)).toBe(true);
    }
  });

  it("sits every fourth square around the 56-square perimeter", () => {
    const ring = perimeterRing();
    expect(ring).toHaveLength(56);

    const ringNames = ring.map(squareName);
    const planetIndices = PLANETS.map((planet) => {
      const index = ringNames.indexOf(squareName(planet));
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    }).sort((a, b) => a - b);

    for (let i = 1; i < planetIndices.length; i++) {
      expect(planetIndices[i] - planetIndices[i - 1]).toBe(4);
    }
    // The gap wrapping from the last planet back to the first is also four.
    expect(
      56 - planetIndices[planetIndices.length - 1] + planetIndices[0],
    ).toBe(4);
  });

  it("matches isPlanet for every planet and rejects a sample of non-planet squares", () => {
    for (const planet of PLANETS) {
      expect(isPlanet(planet)).toBe(true);
    }
    expect(isPlanet(squareAt("A", 1))).toBe(false);
    expect(isPlanet(squareAt("H", 8))).toBe(false);
    expect(isPlanet(squareAt("O", 15))).toBe(false);
  });
});
