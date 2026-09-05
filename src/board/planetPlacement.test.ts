import { describe, expect, it } from "vitest";
import { PLANETS } from "../rules/planets";
import { squareAt, squareName } from "../rules/board";
import { PLANET_ART } from "./planetArt";
import { planetArrangement, planetForSquare } from "./planetPlacement";

const PLANET_SQUARE_NAMES = PLANETS.map(squareName);

describe("planetArrangement", () => {
  it("gives every planet square exactly one drawing, and uses every drawing exactly once", () => {
    const arrangement = planetArrangement(1234);

    expect(arrangement.size).toBe(PLANETS.length);
    for (const name of PLANET_SQUARE_NAMES) {
      expect(arrangement.has(name)).toBe(true);
    }

    const numbers = [...arrangement.values()].map((planet) => planet.number);
    expect(new Set(numbers).size).toBe(PLANET_ART.length);
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      [...PLANET_ART.map((planet) => planet.number)].sort((a, b) => a - b),
    );
  });

  it("gives the same seed the same arrangement, every time", () => {
    const first = planetArrangement(20260905);
    const second = planetArrangement(20260905);

    for (const name of PLANET_SQUARE_NAMES) {
      expect(first.get(name)?.number).toBe(second.get(name)?.number);
    }
  });

  it("gives different seeds different arrangements", () => {
    const first = planetArrangement(1);
    const second = planetArrangement(2);

    const differs = PLANET_SQUARE_NAMES.some(
      (name) => first.get(name)?.number !== second.get(name)?.number,
    );
    expect(differs).toBe(true);
  });
});

describe("planetForSquare", () => {
  it("returns the arrangement's drawing for a planet square, and undefined for a non-planet square", () => {
    const arrangement = planetArrangement(42);
    const someSquare = PLANETS[0];

    expect(planetForSquare(arrangement, someSquare)).toBe(
      arrangement.get(squareName(someSquare)),
    );
    expect(planetForSquare(arrangement, squareAt("H", 8))).toBeUndefined();
  });
});
