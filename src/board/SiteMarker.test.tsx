// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { SiteState } from "../rules/sites";
import { SiteMarker } from "./SiteMarker";

afterEach(cleanup);

const STATES: readonly SiteState[] = ["active", "charged", "dormant"];

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
// doc/plan/00000023-update-node-visual/node-artwork.md, transcribed here as
// the expectation an assertion checks against, independently of
// SiteMarker.tsx's own table. Active's own start and end sit at pressure 1
// and the pressure cap respectively (see SiteMarker.tsx's ACTIVE_*
// constants).
const ACTIVE_START: ExpectedArtwork = {
  radius: "12",
  stops: [
    { offset: "0%", color: "#F1DBA5", opacity: "1" },
    { offset: "100%", color: "#DAA520", opacity: "0.75" },
  ],
};

const ACTIVE_END: ExpectedArtwork = {
  radius: "24",
  stops: [
    { offset: "0%", color: "#DAA520", opacity: "1" },
    { offset: "100%", color: "#DAA520", opacity: "0.5" },
  ],
};

const EXPECTED_ARTWORK: Record<SiteState, ExpectedArtwork> = {
  active: ACTIVE_START,
  charged: {
    radius: "70",
    stops: [
      { offset: "0%", color: "#DAA520", opacity: "1" },
      { offset: "25%", color: "#DAA520", opacity: "0.7" },
      { offset: "100%", color: "#F5DEB3", opacity: "1" },
    ],
  },
  dormant: {
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
    "moves dormant's middle stop to $expectedOffset at cycle position $cyclePosition",
    ({ cyclePosition, expectedOffset }) => {
      const { container } = render(
        <SiteMarker
          state="dormant"
          squareName={SQUARE_NAME}
          cyclePosition={cyclePosition}
        />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute("offset", expectedOffset);
    },
  );

  it("renders active's pressure-1 appearance at cycle position 0", () => {
    const { container } = render(
      <SiteMarker state="active" squareName={SQUARE_NAME} cyclePosition={0} />,
    );

    const circle = container.querySelector("circle");
    expect(circle).toHaveAttribute("r", ACTIVE_START.radius);

    const stops = container.querySelectorAll("stop");
    expect(stops[0]).toHaveAttribute("stop-color", ACTIVE_START.stops[0].color);
    expect(stops[1]).toHaveAttribute(
      "stop-opacity",
      ACTIVE_START.stops[1].opacity,
    );
  });

  it("renders today's disc at active's pressure cap, cycle position 1", () => {
    const { container } = render(
      <SiteMarker state="active" squareName={SQUARE_NAME} cyclePosition={1} />,
    );

    const circle = container.querySelector("circle");
    expect(circle).toHaveAttribute("r", ACTIVE_END.radius);

    const stops = container.querySelectorAll("stop");
    expect(stops[0]).toHaveAttribute("stop-color", ACTIVE_END.stops[0].color);
    expect(stops[1]).toHaveAttribute(
      "stop-opacity",
      ACTIVE_END.stops[1].opacity,
    );
  });

  it("sits halfway between active's two ends at cycle position 0.5", () => {
    const { container } = render(
      <SiteMarker
        state="active"
        squareName={SQUARE_NAME}
        cyclePosition={0.5}
      />,
    );

    const circle = container.querySelector("circle");
    expect(circle).toHaveAttribute("r", "18");

    const stops = container.querySelectorAll("stop");
    // #F1DBA5 -> #DAA520, per channel: F1->DA, DB->A5, A5->20.
    expect(stops[0]).toHaveAttribute("stop-color", "#E6C063");
    expect(stops[1]).toHaveAttribute("stop-opacity", "0.625");
  });

  it("falls back to active's pressure-1 appearance when no cycle position is given", () => {
    const { container } = render(
      <SiteMarker state="active" squareName={SQUARE_NAME} />,
    );

    const circle = container.querySelector("circle");
    expect(circle).toHaveAttribute("r", ACTIVE_START.radius);

    const stops = container.querySelectorAll("stop");
    expect(stops[0]).toHaveAttribute("stop-color", ACTIVE_START.stops[0].color);
  });

  it.each([
    { cyclePosition: -0.5, expected: ACTIVE_START },
    { cyclePosition: 1.5, expected: ACTIVE_END },
  ])(
    "clamps active's cycle position $cyclePosition to its nearer end",
    ({ cyclePosition, expected }) => {
      const { container } = render(
        <SiteMarker
          state="active"
          squareName={SQUARE_NAME}
          cyclePosition={cyclePosition}
        />,
      );

      const circle = container.querySelector("circle");
      expect(circle).toHaveAttribute("r", expected.radius);
    },
  );

  it.each(["charged", "dormant"] as const)(
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
