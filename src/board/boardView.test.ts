import { describe, expect, it } from "vitest";
import { ALL_SQUARES, BOARD_SIZE, squareAt, squareName } from "../rules/board";
import { gridPositionForSquare, squareForGridPosition } from "./boardView";

describe("gridPositionForSquare", () => {
  it("maps the four corners", () => {
    expect(gridPositionForSquare(squareAt("A", 15))).toEqual({
      row: 0,
      column: 0,
    });
    expect(gridPositionForSquare(squareAt("O", 15))).toEqual({
      row: 0,
      column: 14,
    });
    expect(gridPositionForSquare(squareAt("A", 1))).toEqual({
      row: 14,
      column: 0,
    });
    expect(gridPositionForSquare(squareAt("O", 1))).toEqual({
      row: 14,
      column: 14,
    });
  });

  it("maps the centre square H8", () => {
    expect(gridPositionForSquare(squareAt("H", 8))).toEqual({
      row: 7,
      column: 7,
    });
  });
});

describe("square <-> grid position round trip", () => {
  it("returns every square to itself and covers every grid index exactly once", () => {
    const seen = new Set<string>();
    for (const square of ALL_SQUARES) {
      const position = gridPositionForSquare(square);
      expect(position.row).toBeGreaterThanOrEqual(0);
      expect(position.row).toBeLessThan(BOARD_SIZE);
      expect(position.column).toBeGreaterThanOrEqual(0);
      expect(position.column).toBeLessThan(BOARD_SIZE);

      const key = `${position.row},${position.column}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);

      expect(squareForGridPosition(position)).toEqual(square);
    }
    expect(seen.size).toBe(BOARD_SIZE * BOARD_SIZE);
  });
});

describe("squareForGridPosition", () => {
  it("rejects an out-of-range grid position, naming it", () => {
    expect(() => squareForGridPosition({ row: -1, column: 0 })).toThrow(
      /row -1, column 0/,
    );
    expect(() => squareForGridPosition({ row: 0, column: BOARD_SIZE })).toThrow(
      /row 0, column 15/,
    );
    expect(() => squareForGridPosition({ row: BOARD_SIZE, column: 0 })).toThrow(
      /row 15, column 0/,
    );
  });

  it("is named as expected at the corners and centre", () => {
    expect(squareName(squareForGridPosition({ row: 0, column: 0 }))).toBe(
      "A15",
    );
    expect(squareName(squareForGridPosition({ row: 0, column: 14 }))).toBe(
      "O15",
    );
    expect(squareName(squareForGridPosition({ row: 14, column: 0 }))).toBe(
      "A1",
    );
    expect(squareName(squareForGridPosition({ row: 14, column: 14 }))).toBe(
      "O1",
    );
    expect(squareName(squareForGridPosition({ row: 7, column: 7 }))).toBe("H8");
  });
});
