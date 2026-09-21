import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareName } from "./board";
import { dealBonusPlanets } from "./bonusPlanets";
import { isPlanet, PLANETS } from "./planets";
import { mulberry32 } from "./random";

function boardIndexOf(squareNameToFind: string): number {
  return ALL_SQUARES.findIndex(
    (square) => squareName(square) === squareNameToFind,
  );
}

describe("dealBonusPlanets (rules.md §3.4)", () => {
  it("deals each side three distinct planet squares", () => {
    const [bySide] = dealBonusPlanets(1);
    for (const side of ["green", "red"] as const) {
      const planets = bySide[side];
      expect(planets).toHaveLength(3);
      for (const square of planets) {
        expect(isPlanet(square)).toBe(true);
      }
      const names = new Set(planets.map(squareName));
      expect(names.size).toBe(3);
    }
  });

  it("returns each side's three in board order", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const [bySide] = dealBonusPlanets(seed);
      for (const side of ["green", "red"] as const) {
        const indexes = bySide[side].map((square) =>
          boardIndexOf(squareName(square)),
        );
        const sorted = [...indexes].sort((a, b) => a - b);
        expect(indexes).toEqual(sorted);
      }
    }
  });

  it("deals the same six planets from the same seed", () => {
    const [first] = dealBonusPlanets(42);
    const [second] = dealBonusPlanets(42);
    expect(first.green.map(squareName)).toEqual(second.green.map(squareName));
    expect(first.red.map(squareName)).toEqual(second.red.map(squareName));
  });

  it("generally deals different planets from different seeds", () => {
    const deals = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const [bySide] = dealBonusPlanets(seed);
      deals.add(
        `${bySide.green.map(squareName).join(",")}|${bySide.red
          .map(squareName)
          .join(",")}`,
      );
    }
    expect(deals.size).toBeGreaterThan(1);
  });

  it("draws the two sides independently: some seeds overlap, some are disjoint", () => {
    let sawOverlap = false;
    let sawDisjoint = false;
    for (let seed = 1; seed <= 50; seed++) {
      const [bySide] = dealBonusPlanets(seed);
      const greenNames = new Set(bySide.green.map(squareName));
      const redNames = new Set(bySide.red.map(squareName));
      const overlapCount = [...greenNames].filter((name) =>
        redNames.has(name),
      ).length;
      if (overlapCount > 0) {
        sawOverlap = true;
      }
      if (overlapCount === 0) {
        sawDisjoint = true;
      }
      if (sawOverlap && sawDisjoint) {
        break;
      }
    }
    expect(sawOverlap).toBe(true);
    expect(sawDisjoint).toBe(true);
  });

  it("consumes exactly six mulberry32 steps", () => {
    const seed = 12345;
    const [, nextSeed] = dealBonusPlanets(seed);

    let expectedSeed = seed;
    for (let step = 0; step < 6; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }

    expect(nextSeed).toBe(expectedSeed);
  });

  it("only ever deals from the twelve planet squares", () => {
    const planetNames = new Set(PLANETS.map(squareName));
    for (let seed = 1; seed <= 10; seed++) {
      const [bySide] = dealBonusPlanets(seed);
      for (const side of ["green", "red"] as const) {
        for (const square of bySide[side]) {
          expect(planetNames.has(squareName(square))).toBe(true);
        }
      }
    }
  });
});
