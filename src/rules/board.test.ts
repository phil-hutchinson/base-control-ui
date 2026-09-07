import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  ROW_NUMBERS,
  chebyshevDistance,
  isOnBoard,
  squareAt,
  squareFromName,
  squareName,
} from "./board";

describe("board size", () => {
  it("is 15 x 15", () => {
    expect(BOARD_SIZE).toBe(15);
    expect(COLUMN_LETTERS).toHaveLength(15);
    expect(ROW_NUMBERS).toHaveLength(15);
  });

  it("lists all 225 squares", () => {
    expect(ALL_SQUARES).toHaveLength(225);
  });

  it("has no duplicate squares", () => {
    const names = new Set(ALL_SQUARES.map(squareName));
    expect(names.size).toBe(225);
  });
});

describe("named squares", () => {
  it("has A1 and O15 as opposite corners, and A15/O1 as the other two", () => {
    expect(squareName(squareAt("A", 1))).toBe("A1");
    expect(squareName(squareAt("O", 15))).toBe("O15");
    expect(squareName(squareAt("A", 15))).toBe("A15");
    expect(squareName(squareAt("O", 1))).toBe("O1");
  });

  it("has H8 as the centre", () => {
    expect(squareName(squareAt("H", 8))).toBe("H8");
  });
});

describe("naming round-trip", () => {
  it("parses back to the original square for every square on the board", () => {
    for (const square of ALL_SQUARES) {
      expect(squareFromName(squareName(square))).toEqual(square);
    }
  });
});

describe("bounds", () => {
  it("accepts every column/row pair on the board", () => {
    for (const column of COLUMN_LETTERS) {
      for (const row of ROW_NUMBERS) {
        expect(isOnBoard(column, row)).toBe(true);
      }
    }
  });

  it("rejects a column beyond O", () => {
    expect(isOnBoard("P", 1)).toBe(false);
    expect(() => squareFromName("P1")).toThrow();
  });

  it("rejects a row of 0 or below", () => {
    expect(isOnBoard("A", 0)).toBe(false);
    expect(() => squareFromName("A0")).toThrow();
  });

  it("rejects a row beyond 15", () => {
    expect(isOnBoard("A", 16)).toBe(false);
    expect(() => squareFromName("A16")).toThrow();
  });

  it("does not clamp an out-of-range column/row pair into a valid square", () => {
    expect(() => squareAt("A", 16)).toThrow(RangeError);
  });

  it("rejects a malformed square name", () => {
    expect(() => squareFromName("H")).toThrow();
    expect(() => squareFromName("8H")).toThrow();
    expect(() => squareFromName("h8")).toThrow();
    expect(() => squareFromName("")).toThrow();
  });
});

describe("chebyshevDistance", () => {
  it("is zero from a square to itself", () => {
    expect(chebyshevDistance(squareAt("H", 8), squareAt("H", 8))).toBe(0);
  });

  it("is symmetric", () => {
    const a = squareAt("C", 3);
    const b = squareAt("K", 11);
    expect(chebyshevDistance(a, b)).toBe(chebyshevDistance(b, a));
  });

  it("is 1 for a diagonal neighbour", () => {
    expect(chebyshevDistance(squareAt("H", 8), squareAt("I", 9))).toBe(1);
  });

  it("is the larger of the two axis differences on a spread pair", () => {
    // Column A to K is 10 letters apart; row 1 to 4 is 3 apart.
    expect(chebyshevDistance(squareAt("A", 1), squareAt("K", 4))).toBe(10);
    // Column A to C is 2 letters apart; row 1 to 9 is 8 apart.
    expect(chebyshevDistance(squareAt("A", 1), squareAt("C", 9))).toBe(8);
  });
});
