import { describe, expect, it } from "vitest";
import { squareAt, squareName, type Square } from "../rules/board";
import { BAYS } from "../rules/bays";
import { PLANETS, type PlanetTraits } from "./planetArt";
import { planetForSquare, RING_ORDER } from "./planetPlacement";

function namesOf(squares: readonly Square[]): readonly string[] {
  return [...squares.map(squareName)].sort();
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
