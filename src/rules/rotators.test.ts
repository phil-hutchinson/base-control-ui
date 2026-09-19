import { describe, expect, it } from "vitest";
import { ALL_SQUARES, type Square, squareAt, squareName } from "./board";
import { PLANETS } from "./planets";
import { drawIndex } from "./random";
import { placeRotators, ROTATOR_SECTIONS } from "./rotators";

function names(squares: readonly Square[]): string[] {
  return squares.map(squareName);
}

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
});

describe("placeRotators (rules.md §3.3)", () => {
  it("draws one rotator per section, each inside its own section, on an empty board", () => {
    const [rotators] = placeRotators([], [], 1);
    expect(rotators).toHaveLength(9);

    const rotatorNames = new Set(names(rotators));
    for (const section of ROTATOR_SECTIONS) {
      const sectionNames = new Set(names(section.squares));
      const inSection = rotators.filter((square) =>
        sectionNames.has(squareName(square)),
      );
      expect(inSection).toHaveLength(1);
    }
    expect(rotatorNames.size).toBe(9);
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

  it("skips a section with no free square, and costs no seed step for it", () => {
    const lastSection = ROTATOR_SECTIONS[ROTATOR_SECTIONS.length - 1];
    const shipSquares = lastSection.squares;

    const [rotators, finalSeed] = placeRotators([], shipSquares, 42);
    expect(rotators).toHaveLength(8);

    const lastSectionNames = new Set(names(lastSection.squares));
    for (const rotator of rotators) {
      expect(lastSectionNames.has(squareName(rotator))).toBe(false);
    }

    // Replay the first eight sections' draws by hand: the seed after the
    // ninth (blocked) section must equal the seed after the eighth draw.
    let workingSeed = 42;
    for (let index = 0; index < ROTATOR_SECTIONS.length - 1; index++) {
      const section = ROTATOR_SECTIONS[index];
      const [, nextSeed] = drawIndex(workingSeed, section.squares.length);
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
