import { describe, expect, it } from "vitest";
import { BAYS, isBay } from "./bays";
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

describe("bays", () => {
  it("has exactly fourteen bays", () => {
    expect(BAYS).toHaveLength(14);
  });

  it("lies entirely on the outer edge", () => {
    for (const bay of BAYS) {
      const onEdge =
        bay.column === "A" ||
        bay.column === "O" ||
        bay.row === 1 ||
        bay.row === 15;
      expect(onEdge).toBe(true);
    }
  });

  it("contains no corner", () => {
    const corners = new Set(["A1", "A15", "O1", "O15"]);
    for (const bay of BAYS) {
      expect(corners.has(squareName(bay))).toBe(false);
    }
  });

  it("has every bay on the board", () => {
    for (const bay of BAYS) {
      expect(isOnBoard(bay.column, bay.row)).toBe(true);
    }
  });

  it("sits every fourth square around the 56-square perimeter", () => {
    const ring = perimeterRing();
    expect(ring).toHaveLength(56);

    const ringNames = ring.map(squareName);
    const bayIndices = BAYS.map((bay) => {
      const index = ringNames.indexOf(squareName(bay));
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    }).sort((a, b) => a - b);

    for (let i = 1; i < bayIndices.length; i++) {
      expect(bayIndices[i] - bayIndices[i - 1]).toBe(4);
    }
    // The gap wrapping from the last bay back to the first is also four.
    expect(56 - bayIndices[bayIndices.length - 1] + bayIndices[0]).toBe(4);
  });

  it("matches isBay for every bay and rejects a sample of non-bay squares", () => {
    for (const bay of BAYS) {
      expect(isBay(bay)).toBe(true);
    }
    expect(isBay(squareAt("A", 1))).toBe(false);
    expect(isBay(squareAt("H", 8))).toBe(false);
    expect(isBay(squareAt("O", 15))).toBe(false);
  });
});
