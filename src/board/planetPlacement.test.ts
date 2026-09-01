import { describe, expect, it } from "vitest";
import {
  COLUMN_LETTERS,
  squareAt,
  squareName,
  type Square,
} from "../rules/board";
import { BAYS } from "../rules/bays";
import { PLANETS, type PlanetTraits } from "./planetArt";
import { planetForSquare, RING_ORDER } from "./planetPlacement";

function namesOf(squares: readonly Square[]): readonly string[] {
  return [...squares.map(squareName)].sort();
}

function columnIndex(square: Square): number {
  return COLUMN_LETTERS.indexOf(square.column);
}

/** Whether a run of numbers strictly increases. */
function isAscendingRun(numbers: readonly number[]): boolean {
  return numbers.every(
    (value, index) => index === 0 || value > numbers[index - 1],
  );
}

/** Whether a run of numbers strictly decreases. */
function isDescendingRun(numbers: readonly number[]): boolean {
  return numbers.every(
    (value, index) => index === 0 || value < numbers[index - 1],
  );
}

/** Whether two planets share any of the traits the spread is judged on. */
function sharesATrait(a: PlanetTraits, b: PlanetTraits): boolean {
  return (
    (a.ring && b.ring) ||
    (a.moon && b.moon) ||
    (a.craters && b.craters) ||
    a.colorFamily === b.colorFamily
  );
}

describe("RING_ORDER", () => {
  it("holds exactly the fourteen squares of BAYS, none missing or repeated", () => {
    expect(RING_ORDER).toHaveLength(14);
    expect(namesOf(RING_ORDER)).toEqual(namesOf(BAYS));
  });

  it("walks the board's perimeter clockwise as four edge runs", () => {
    // The perimeter's four corners (L15->O14, O2->L1, D1->A2, A14->D15) each
    // cross from one edge to the next, so the walk cannot be checked as a
    // single run of consecutive same-edge pairs. Instead it is checked as
    // four runs, one per edge, that between them account for every square.
    const top = RING_ORDER.slice(0, 3);
    const right = RING_ORDER.slice(3, 7);
    const bottom = RING_ORDER.slice(7, 10);
    const left = RING_ORDER.slice(10, 14);

    expect(top.every((square) => square.row === 15)).toBe(true);
    expect(isAscendingRun(top.map(columnIndex))).toBe(true);

    expect(right.every((square) => square.column === "O")).toBe(true);
    expect(isDescendingRun(right.map((square) => square.row))).toBe(true);

    expect(bottom.every((square) => square.row === 1)).toBe(true);
    expect(isDescendingRun(bottom.map(columnIndex))).toBe(true);

    expect(left.every((square) => square.column === "A")).toBe(true);
    expect(isAscendingRun(left.map((square) => square.row))).toBe(true);
  });
});

describe("planetForSquare", () => {
  it("maps every bay to a planet", () => {
    for (const bay of BAYS) {
      expect(planetForSquare(bay)).toBeDefined();
    }
  });

  it("uses every planet exactly once", () => {
    const numbers = BAYS.map((bay) => planetForSquare(bay)?.number);
    expect(new Set(numbers).size).toBe(14);
    expect([...numbers].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      PLANETS.map((planet) => planet.number).sort((a, b) => a - b),
    );
  });

  it("maps a non-bay square to nothing", () => {
    expect(planetForSquare(squareAt("H", 8))).toBeUndefined();
  });
});

describe("the spread around the ring", () => {
  it("never seats two planets sharing a trait next to each other, including where the ring closes", () => {
    for (let i = 0; i < RING_ORDER.length; i++) {
      const here = planetForSquare(RING_ORDER[i]);
      const next = planetForSquare(RING_ORDER[(i + 1) % RING_ORDER.length]);
      expect(here).toBeDefined();
      expect(next).toBeDefined();
      if (!here || !next) {
        continue;
      }
      expect(
        sharesATrait(here.traits, next.traits),
        `${squareName(RING_ORDER[i])} (planet ${here.number}) and ` +
          `${squareName(RING_ORDER[(i + 1) % RING_ORDER.length])} ` +
          `(planet ${next.number}) share a trait`,
      ).toBe(false);
    }
  });
});
