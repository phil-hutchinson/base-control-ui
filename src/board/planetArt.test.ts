import { describe, expect, it } from "vitest";
import { PLANET_ART } from "./planetArt";

describe("PLANET_ART", () => {
  it("has exactly fourteen entries", () => {
    expect(PLANET_ART).toHaveLength(14);
  });

  it("carries the gallery's own numbers, 1-14, with no gaps or repeats", () => {
    const numbers = [...PLANET_ART.map((planet) => planet.number)].sort(
      (a, b) => a - b,
    );
    expect(numbers).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
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
    const signatures = PLANET_ART.map(
      (planet) =>
        `${planet.traits.ring}|${planet.traits.moon}|${planet.traits.craters}|${planet.surface}|${planet.ringOrientation ?? ""}`,
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
