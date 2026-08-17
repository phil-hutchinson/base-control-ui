import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName } from "./board";
import { SITES } from "./sites";

describe("sites", () => {
  it("has exactly seventeen sites, no duplicates", () => {
    expect(SITES).toHaveLength(17);
    const names = new Set(SITES.map(squareName));
    expect(names.size).toBe(17);
  });

  it("lies entirely in the interior of the board", () => {
    for (const site of SITES) {
      expect(site.column).not.toBe("A");
      expect(site.column).not.toBe("O");
      expect(site.row).not.toBe(1);
      expect(site.row).not.toBe(15);
    }
  });

  it("is unchanged by a mirror across column H", () => {
    const columnIndex = new Map(
      COLUMN_LETTERS.map((letter, index) => [letter, index]),
    );
    const columnAt = new Map(
      COLUMN_LETTERS.map((letter, index) => [index, letter]),
    );
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const index = columnIndex.get(site.column);
      if (index === undefined) {
        throw new Error(`unknown column ${site.column}`);
      }
      const mirroredColumn = columnAt.get(14 - index);
      if (mirroredColumn === undefined) {
        throw new Error("mirror across column H left the board");
      }
      const mirrored = squareAt(mirroredColumn, site.row);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("is unchanged by a mirror across row 8", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirroredRow = 16 - site.row;
      const mirrored = squareAt(site.column, mirroredRow);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("shares no square with a bay", () => {
    const bayNames = new Set(BAYS.map(squareName));
    for (const site of SITES) {
      expect(bayNames.has(squareName(site))).toBe(false);
    }
  });

  it("matches §3.2's table row by row", () => {
    const expected = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "E5",
      "K5",
      "D8",
      "H8",
      "L8",
      "E11",
      "K11",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];

    expect(SITES.map(squareName)).toEqual(expected);
  });
});
