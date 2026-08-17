import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName, type Square } from "./board";
import { SITES, STARTING_ACTIVE_SITES, startingSiteState } from "./sites";

const COLUMN_INDEX = new Map(
  COLUMN_LETTERS.map((letter, index) => [letter, index]),
);
const COLUMN_AT = new Map(
  COLUMN_LETTERS.map((letter, index) => [index, letter]),
);

/** The square that mirrors the given one across column H. */
function mirrorAcrossColumnH(square: Square): Square {
  const index = COLUMN_INDEX.get(square.column);
  if (index === undefined) {
    throw new Error(`unknown column ${square.column}`);
  }
  const mirroredColumn = COLUMN_AT.get(14 - index);
  if (mirroredColumn === undefined) {
    throw new Error("mirror across column H left the board");
  }
  return squareAt(mirroredColumn, square.row);
}

/** The square that mirrors the given one across row 8. */
function mirrorAcrossRow8(square: Square): Square {
  return squareAt(square.column, 16 - square.row);
}

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
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossColumnH(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("is unchanged by a mirror across row 8", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossRow8(site);
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

describe("starting site state", () => {
  it("has exactly five sites starting active: H8, E5, K5, E11, K11", () => {
    expect(STARTING_ACTIVE_SITES.map(squareName)).toEqual([
      "H8",
      "E5",
      "K5",
      "E11",
      "K11",
    ]);
  });

  it("has the other twelve sites starting dormant", () => {
    const activeNames = new Set(STARTING_ACTIVE_SITES.map(squareName));
    const dormantSites = SITES.filter(
      (site) => !activeNames.has(squareName(site)),
    );

    expect(dormantSites).toHaveLength(12);
    for (const site of dormantSites) {
      expect(startingSiteState(site)).toBe("dormant");
    }
  });

  it("has no site starting charged or depleted", () => {
    for (const site of SITES) {
      expect(startingSiteState(site)).not.toBe("charged");
      expect(startingSiteState(site)).not.toBe("depleted");
    }
  });

  it("has every starting-active square in the site list", () => {
    const siteNames = new Set(SITES.map(squareName));
    for (const square of STARTING_ACTIVE_SITES) {
      expect(siteNames.has(squareName(square))).toBe(true);
    }
  });

  it("has no site state for a square that is not a site", () => {
    expect(startingSiteState(squareAt("G", 7))).toBeUndefined();
    expect(startingSiteState(squareAt("D", 15))).toBeUndefined();
  });

  it("is itself symmetric about column H and row 8", () => {
    const names = new Set(STARTING_ACTIVE_SITES.map(squareName));

    for (const site of STARTING_ACTIVE_SITES) {
      expect(names.has(squareName(mirrorAcrossColumnH(site)))).toBe(true);
      expect(names.has(squareName(mirrorAcrossRow8(site)))).toBe(true);
    }
  });
});
