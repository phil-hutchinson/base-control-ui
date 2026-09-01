// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlanetDefs } from "./PlanetDefs";
import { PLANETS } from "./planetArt";

// jsdom has no SVG rendering: it will not resolve a `<use>` or apply a
// gradient, so every check here is structural - which ids exist, and
// whether every internal reference resolves to one of them.

afterEach(cleanup);

/** Every id planetArt.ts names, across all fourteen planets. */
function namedIds(): readonly string[] {
  return PLANETS.flatMap((planet) => Object.values(planet.ids));
}

/** The id an internal reference attribute points at, or undefined if the attribute is not a reference at all. */
function referencedId(
  attributeName: string,
  value: string,
): string | undefined {
  if (attributeName === "href") {
    return /^#(.+)$/.exec(value)?.[1];
  }
  return /^url\(#(.+)\)$/.exec(value)?.[1];
}

describe("PlanetDefs", () => {
  it("is a single hidden sprite, aria-hidden with no title or description", () => {
    const { container } = render(<PlanetDefs />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute("aria-hidden", "true");
    expect(svgs[0].querySelector("title")).not.toBeInTheDocument();
    expect(svgs[0].querySelector("desc")).not.toBeInTheDocument();
  });

  it("gives every element a unique id, and defines every id planetArt.ts names exactly once", () => {
    const { container } = render(<PlanetDefs />);

    const ids = Array.from(container.querySelectorAll("[id]"), (el) => el.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of namedIds()) {
      expect(ids.filter((candidate) => candidate === id)).toHaveLength(1);
    }
  });

  it("resolves every internal reference - each href and each url(#...) - to an id the sprite defines", () => {
    const { container } = render(<PlanetDefs />);

    const definedIds = new Set(
      Array.from(container.querySelectorAll("[id]"), (el) => el.id),
    );

    const referencingAttributes = ["href", "fill", "stroke"];
    let referenceCount = 0;
    for (const element of container.querySelectorAll("*")) {
      for (const attribute of referencingAttributes) {
        const value = element.getAttribute(attribute);
        if (value === null) {
          continue;
        }
        const target = referencedId(attribute, value);
        if (target === undefined) {
          continue;
        }
        referenceCount += 1;
        expect(definedIds.has(target)).toBe(true);
      }
    }

    // Guards against the check above passing vacuously if a rename broke
    // every reference's shape rather than its target.
    expect(referenceCount).toBeGreaterThan(0);
  });
});
