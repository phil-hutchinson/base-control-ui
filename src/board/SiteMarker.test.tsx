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

const SQUARE_NAME = "H8";

interface ExpectedStop {
  readonly offset: string;
  readonly color: string;
  readonly opacity: string;
}

interface ExpectedArtwork {
  readonly radius: string;
  readonly stops: readonly ExpectedStop[];
}

// Radii, stop offsets, colours and opacities as specified in
// node-artwork.md, transcribed here as the expectation an assertion checks
// against, independently of SiteMarker.tsx's own table.
const EXPECTED_ARTWORK: Record<SiteState, ExpectedArtwork> = {
  dormant: {
    radius: "12",
    stops: [
      { offset: "0%", color: "#F1DBA5", opacity: "1" },
      { offset: "100%", color: "#DAA520", opacity: "0.75" },
    ],
  },
  active: {
    radius: "24",
    stops: [
      { offset: "0%", color: "#DAA520", opacity: "1" },
      { offset: "100%", color: "#DAA520", opacity: "0.5" },
    ],
  },
  charged: {
    radius: "70",
    stops: [
      { offset: "0%", color: "#DAA520", opacity: "1" },
      { offset: "25%", color: "#DAA520", opacity: "0.7" },
      { offset: "100%", color: "#F5DEB3", opacity: "1" },
    ],
  },
  depleted: {
    radius: "70",
    stops: [
      { offset: "0%", color: "#808080", opacity: "1" },
      { offset: "50%", color: "#808080", opacity: "0.7" },
      { offset: "100%", color: "#FFFFFF", opacity: "1" },
    ],
  },
};

describe("SiteMarker", () => {
  it.each(STATES)("gives %s its own state modifier class", (state) => {
    const { container } = render(
      <SiteMarker state={state} squareName={SQUARE_NAME} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("site-marker", `site-marker--${state}`);
  });

  it("is decorative: aria-hidden, no title or desc, and no accessible text", () => {
    const { container } = render(
      <SiteMarker state="active" squareName={SQUARE_NAME} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("title")).not.toBeInTheDocument();
    expect(container.querySelector("desc")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });

  it.each(STATES)(
    "renders exactly one centred circle in the shared viewBox for %s",
    (state) => {
      const { container } = render(
        <SiteMarker state={state} squareName={SQUARE_NAME} />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 100 100");

      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(1);
      expect(circles[0]).toHaveAttribute("cx", "50");
      expect(circles[0]).toHaveAttribute("cy", "50");
    },
  );

  it.each(STATES)(
    "draws %s's radius, gradient stops, colours and opacities as specified",
    (state) => {
      const { container } = render(
        <SiteMarker state={state} squareName={SQUARE_NAME} />,
      );

      const expected = EXPECTED_ARTWORK[state];
      const circle = container.querySelector("circle");
      expect(circle).toHaveAttribute("r", expected.radius);

      const stops = container.querySelectorAll("stop");
      expect(stops).toHaveLength(expected.stops.length);
      expected.stops.forEach((expectedStop, index) => {
        expect(stops[index]).toHaveAttribute("offset", expectedStop.offset);
        expect(stops[index]).toHaveAttribute("stop-color", expectedStop.color);
        expect(stops[index]).toHaveAttribute(
          "stop-opacity",
          expectedStop.opacity,
        );
      });
    },
  );

  it.each(STATES)(
    "fills %s's circle with a gradient id built from its square name",
    (state) => {
      const { container } = render(
        <SiteMarker state={state} squareName={SQUARE_NAME} />,
      );

      const circle = container.querySelector("circle");
      const gradient = container.querySelector("radialGradient");
      expect(gradient).toHaveAttribute("id", `site-${SQUARE_NAME}-fill`);
      expect(circle).toHaveAttribute("fill", `url(#site-${SQUARE_NAME}-fill)`);
    },
  );

  it.each([
    { cyclePosition: 0, expectedOffset: "25%" },
    { cyclePosition: 0.5, expectedOffset: "37.5%" },
    { cyclePosition: 1, expectedOffset: "50%" },
  ])(
    "moves charged's middle stop to $expectedOffset at cycle position $cyclePosition",
    ({ cyclePosition, expectedOffset }) => {
      const { container } = render(
        <SiteMarker
          state="charged"
          squareName={SQUARE_NAME}
          cyclePosition={cyclePosition}
        />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute("offset", expectedOffset);
    },
  );

  it.each([
    { cyclePosition: 0, expectedOffset: "50%" },
    { cyclePosition: 0.5, expectedOffset: "37.5%" },
    { cyclePosition: 1, expectedOffset: "25%" },
  ])(
    "moves depleted's middle stop to $expectedOffset at cycle position $cyclePosition",
    ({ cyclePosition, expectedOffset }) => {
      const { container } = render(
        <SiteMarker
          state="depleted"
          squareName={SQUARE_NAME}
          cyclePosition={cyclePosition}
        />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute("offset", expectedOffset);
    },
  );

  it.each(["charged", "depleted"] as const)(
    "falls back to %s's start-of-cycle offset when no cycle position is given",
    (state) => {
      const { container } = render(
        <SiteMarker state={state} squareName={SQUARE_NAME} />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute(
        "offset",
        EXPECTED_ARTWORK[state].stops[1].offset,
      );
    },
  );

  it("reports no axe violations for any state", async () => {
    for (const state of STATES) {
      const { container } = render(
        <SiteMarker state={state} squareName={SQUARE_NAME} />,
      );

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
