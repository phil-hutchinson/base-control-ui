import { describe, expect, it } from "vitest";
import { PLANETS } from "./planetArt";

describe("PLANETS", () => {
  it("has exactly fourteen entries", () => {
    expect(PLANETS).toHaveLength(14);
  });

  it("carries the gallery's own numbers, 1-14, with no gaps or repeats", () => {
    const numbers = [...PLANETS.map((planet) => planet.number)].sort(
      (a, b) => a - b,
    );
    expect(numbers).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it("declares a body id for every planet", () => {
    for (const planet of PLANETS) {
      expect(planet.ids.body).toBeDefined();
    }
  });

  it("gives every declared id the planet- prefix, matching its own number", () => {
    for (const planet of PLANETS) {
      const nn = String(planet.number).padStart(2, "0");
      for (const id of Object.values(planet.ids)) {
        expect(id).toMatch(new RegExp(`^planet-${nn}-[a-z0-9-]+$`));
      }
    }
  });

  it("declares every id uniquely across the whole catalogue", () => {
    const allIds = PLANETS.flatMap((planet) => Object.values(planet.ids));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("makes every planet distinguishable from every other by more than colour", () => {
    const signatures = PLANETS.map(
      (planet) =>
        `${planet.traits.ring}|${planet.traits.moon}|${planet.traits.craters}|${planet.surface}|${planet.ringOrientation ?? ""}`,
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
