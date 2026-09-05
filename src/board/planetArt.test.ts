import { describe, expect, it } from "vitest";
import { PLANET_ART } from "./planetArt";

describe("PLANET_ART", () => {
  it("has exactly twelve entries", () => {
    expect(PLANET_ART).toHaveLength(12);
  });

  it("carries exactly the gallery's numbers 1-10, 13 and 14, with no repeats", () => {
    const numbers = [...PLANET_ART.map((planet) => planet.number)].sort(
      (a, b) => a - b,
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14]);
  });

  it("declares a body id for every planet", () => {
    for (const planet of PLANET_ART) {
      expect(planet.ids.body).toBeDefined();
    }
  });

  it("gives every declared id the planet- prefix, matching its own number", () => {
    for (const planet of PLANET_ART) {
      const nn = String(planet.number).padStart(2, "0");
      for (const id of Object.values(planet.ids)) {
        expect(id).toMatch(new RegExp(`^planet-${nn}-[a-z0-9-]+$`));
      }
    }
  });

  it("declares every id uniquely across the whole catalogue", () => {
    const allIds = PLANET_ART.flatMap((planet) => Object.values(planet.ids));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("makes every planet distinguishable from every other by more than colour", () => {
    // The surface treatment and ring orientation alone are not always
    // enough (two banded, ringless planets both read as "banded"), so the
    // signature also folds in which visual parts a planet's ids declare -
    // whether it has a moon, a ring, craters and so on - which is where
    // that structural difference actually lives.
    const signatures = PLANET_ART.map((planet) => {
      const parts = Object.keys(planet.ids)
        .filter((part) => part !== "body")
        .sort()
        .join(",");
      return `${parts}|${planet.surface}|${planet.ringOrientation ?? ""}`;
    });
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
