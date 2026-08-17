// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { SiteState } from "../rules/sites";
import { SiteMarker } from "./SiteMarker";

afterEach(cleanup);

const STATES: readonly SiteState[] = [
  "dormant",
  "active",
  "charged",
  "depleted",
];

describe("SiteMarker", () => {
  it.each(STATES)("gives %s its own state modifier class", (state) => {
    const { container } = render(<SiteMarker state={state} />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("site-marker", `site-marker--${state}`);
  });

  it("is decorative: aria-hidden, no title or desc, and no accessible text", () => {
    const { container } = render(<SiteMarker state="active" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("title")).not.toBeInTheDocument();
    expect(container.querySelector("desc")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });

  it("differs by more than colour: stroke geometry is distinct across the four states", () => {
    const geometries = STATES.map((state) => {
      const { container } = render(<SiteMarker state={state} />);
      const rings = Array.from(
        container.querySelectorAll(".site-marker__ring"),
      );
      return {
        ringCount: rings.length,
        strokeWidths: rings.map((ring) => ring.getAttribute("stroke-width")),
        dashArrays: rings.map((ring) => ring.getAttribute("stroke-dasharray")),
      };
    });

    // Charged is the only double ring.
    expect(geometries.map((g) => g.ringCount)).toEqual([1, 1, 2, 1]);

    // Dormant (dotted) and depleted (dashed) each have a dash pattern, and
    // the two patterns differ from each other; active (solid) has none.
    const [dormant, active, charged, depleted] = geometries;
    expect(dormant.dashArrays[0]).not.toBeNull();
    expect(depleted.dashArrays[0]).not.toBeNull();
    expect(dormant.dashArrays[0]).not.toBe(depleted.dashArrays[0]);
    expect(active.dashArrays[0]).toBeNull();

    // Dormant is visibly thinner than the other three.
    expect(Number(dormant.strokeWidths[0])).toBeLessThan(
      Number(active.strokeWidths[0]),
    );
    expect(Number(dormant.strokeWidths[0])).toBeLessThan(
      Number(charged.strokeWidths[0]),
    );
    expect(Number(dormant.strokeWidths[0])).toBeLessThan(
      Number(depleted.strokeWidths[0]),
    );

    // All four are geometrically distinct from one another as a whole.
    const signatures = geometries.map((g) =>
      JSON.stringify([g.ringCount, g.strokeWidths, g.dashArrays]),
    );
    expect(new Set(signatures).size).toBe(STATES.length);
  });

  it("reports no axe violations for any state", async () => {
    for (const state of STATES) {
      const { container } = render(<SiteMarker state={state} />);

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
      cleanup();
    }
  });
});
