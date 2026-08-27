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

  it.each(STATES)(
    "renders exactly one centred circle in the shared viewBox for %s",
    (state) => {
      const { container } = render(<SiteMarker state={state} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 100 100");

      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(1);
      expect(circles[0]).toHaveAttribute("cx", "50");
      expect(circles[0]).toHaveAttribute("cy", "50");
    },
  );

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
