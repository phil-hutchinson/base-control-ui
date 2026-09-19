import { describe, expect, it } from "vitest";
import { ALL_SQUARES, type Square, squareAt, squareName } from "./board";
import { isPlanet, PLANETS } from "./planets";
import { drawIndex } from "./random";
import { placeRotators, ROTATOR_SECTIONS } from "./rotators";

function names(squares: readonly Square[]): string[] {
  return squares.map(squareName);
}

function sectionIndexFor(square: Square): number {
  return ROTATOR_SECTIONS.findIndex((section) =>
    section.squares.some(
      (candidate) => squareName(candidate) === squareName(square),
    ),
  );
}

// The four corner sections (rules.md §3.3): the ones holding A1, K1, A11
// and K11. Derived independently of `rotators.ts`'s own internals, off the
// same public `ROTATOR_SECTIONS`, so the test exercises the rule rather than
// the implementation.
const CORNER_SECTION_INDEXES = [
  squareAt("A", 1),
  squareAt("K", 1),
  squareAt("A", 11),
  squareAt("K", 11),
]
  .map(sectionIndexFor)
  .sort((a, b) => a - b);

const OTHER_SECTION_INDEXES = ROTATOR_SECTIONS.map((_, index) => index).filter(
  (index) => !CORNER_SECTION_INDEXES.includes(index),
);

describe("the board's nine 5 x 5 sections (rules.md §3.3)", () => {
  it("has nine sections", () => {
    expect(ROTATOR_SECTIONS).toHaveLength(9);
  });

  it("covers every square exactly once", () => {
    const seen = new Set<string>();
    for (const section of ROTATOR_SECTIONS) {
      expect(section.squares).toHaveLength(25);
      for (const square of section.squares) {
        const name = squareName(square);
        expect(seen.has(name)).toBe(false);
        seen.add(name);
      }
    }
    expect(seen.size).toBe(ALL_SQUARES.length);
    for (const square of ALL_SQUARES) {
      expect(seen.has(squareName(square))).toBe(true);
    }
  });

  it("has four corner sections, one holding each of A1, K1, A11 and K11", () => {
    expect(CORNER_SECTION_INDEXES).toHaveLength(4);
    expect(new Set(CORNER_SECTION_INDEXES).size).toBe(4);
  });
});

describe("placeRotators (rules.md §3.3)", () => {
  it("draws six rotators: one in each corner section, and one in two more of the remaining five, on an empty board", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const [rotators] = placeRotators([], [], seed);
      expect(rotators).toHaveLength(6);

      const sectionCounts = new Map<number, number>();
      for (const square of rotators) {
        const index = sectionIndexFor(square);
        sectionCounts.set(index, (sectionCounts.get(index) ?? 0) + 1);
      }

      for (const cornerIndex of CORNER_SECTION_INDEXES) {
        expect(sectionCounts.get(cornerIndex)).toBe(1);
      }

      const otherSectionsHit = [...sectionCounts.keys()].filter((index) =>
        OTHER_SECTION_INDEXES.includes(index),
      );
      expect(otherSectionsHit).toHaveLength(2);
      for (const index of otherSectionsHit) {
        expect(sectionCounts.get(index)).toBe(1);
      }

      expect(sectionCounts.size).toBe(6);
    }
  });

  it("never falls on a planet, a ship or a node of any state", () => {
    const nodeSquares = [squareAt("D", 7), squareAt("N", 3)];
    const shipSquares = [squareAt("C", 2), squareAt("M", 12)];

    for (let seed = 1; seed <= 20; seed++) {
      const [rotators] = placeRotators(nodeSquares, shipSquares, seed);
      const occupiedNames = new Set([
        ...names(nodeSquares),
        ...names(shipSquares),
        ...names(PLANETS),
      ]);
      for (const rotator of rotators) {
        expect(occupiedNames.has(squareName(rotator))).toBe(false);
      }
    }
  });

  it("skips a full corner section without costing it a seed step, and does not backfill to six", () => {
    const blockedIndex =
      CORNER_SECTION_INDEXES[CORNER_SECTION_INDEXES.length - 1];
    const blockedSection = ROTATOR_SECTIONS[blockedIndex];

    const seed = 42;
    const [rotators, finalSeed] = placeRotators(
      [],
      blockedSection.squares,
      seed,
    );

    expect(rotators).toHaveLength(5);
    const blockedNames = new Set(names(blockedSection.squares));
    for (const rotator of rotators) {
      expect(blockedNames.has(squareName(rotator))).toBe(false);
    }
    for (const cornerIndex of CORNER_SECTION_INDEXES.filter(
      (index) => index !== blockedIndex,
    )) {
      const cornerNames = new Set(names(ROTATOR_SECTIONS[cornerIndex].squares));
      expect(
        rotators.filter((s) => cornerNames.has(squareName(s))),
      ).toHaveLength(1);
    }

    // Replay by hand: the three unblocked corners draw in section order,
    // each from that section's free squares (no planet); the blocked corner
    // costs nothing; then the two section-index draws (one of five, then
    // one of the remaining four) always happen; then a square is drawn from
    // each of those two sections' free squares, in section order.
    function freeCount(sectionIndex: number): number {
      return ROTATOR_SECTIONS[sectionIndex].squares.filter(
        (square) => !isPlanet(square),
      ).length;
    }

    let workingSeed = seed;
    for (const cornerIndex of CORNER_SECTION_INDEXES.filter(
      (index) => index !== blockedIndex,
    )) {
      const [, nextSeed] = drawIndex(workingSeed, freeCount(cornerIndex));
      workingSeed = nextSeed;
    }

    const [firstPick, seedAfterFirstPick] = drawIndex(
      workingSeed,
      OTHER_SECTION_INDEXES.length,
    );
    const remaining = [...OTHER_SECTION_INDEXES];
    const firstChosen = remaining.splice(firstPick, 1)[0];
    workingSeed = seedAfterFirstPick;

    const [secondPick, seedAfterSecondPick] = drawIndex(
      workingSeed,
      remaining.length,
    );
    const secondChosen = remaining[secondPick];
    workingSeed = seedAfterSecondPick;

    for (const index of [firstChosen, secondChosen].sort((a, b) => a - b)) {
      const [, nextSeed] = drawIndex(workingSeed, freeCount(index));
      workingSeed = nextSeed;
    }

    expect(finalSeed).toBe(workingSeed);
  });

  it("is a pure draw: the same seed and inputs give the same set", () => {
    const nodeSquares = [squareAt("H", 8)];
    const shipSquares = [squareAt("A", 1)];

    const first = placeRotators(nodeSquares, shipSquares, 7);
    const second = placeRotators(nodeSquares, shipSquares, 7);
    expect(second).toEqual(first);
  });

  it("generally draws a different set from a different seed", () => {
    const [rotatorsA] = placeRotators([], [], 1);
    const [rotatorsB] = placeRotators([], [], 999_999);
    expect(names(rotatorsB)).not.toEqual(names(rotatorsA));
  });

  it("returns the drawn squares in board order", () => {
    const [rotators] = placeRotators([], [], 3);
    const boardOrder = ALL_SQUARES.filter((square) =>
      new Set(names(rotators)).has(squareName(square)),
    );
    expect(rotators).toEqual(boardOrder);
  });
});
