// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { NodeState } from "../rules/nodes";
import type { NodePriority } from "../rules/nodeQueue";
import type {
  NodeBurnoutAnimation,
  NodeChargeAnimation,
} from "./boardAnimations";
import { NodeMarker } from "./NodeMarker";

afterEach(cleanup);

const STATES: readonly NodeState[] = ["inactive", "charged", "depleted"];

// The two clocked states, whose artwork is a single gradient-filled circle
// that travels through a cycle position. Inactive is drawn differently (a
// stack of rings, tested separately below), so it is excluded from the
// gradient-shaped assertions this constant feeds.
const CLOCKED_STATES = ["charged", "depleted"] as const;

const SQUARE_NAME = "H8";

/** A `#rrggbb` colour as jsdom's CSSOM reports it back from an inline style, for comparing against a colour set via `style` rather than an attribute. */
function hexToRgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

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
// NodeMarker.tsx's own table.
const EXPECTED_ARTWORK: Record<
  (typeof CLOCKED_STATES)[number],
  ExpectedArtwork
> = {
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

// The rings an inactive node draws, radii innermost first, matching
// NodeMarker.tsx's own INACTIVE_RING_RADII exactly, so this file's
// expectation does not silently track the production constant.
const INACTIVE_RING_RADII = ["18", "28", "38"];
const INACTIVE_RING_STROKE_WIDTH = "5";
const INACTIVE_RING_COLOR = "#DAA520";

describe("NodeMarker", () => {
  it.each(STATES)("gives %s its own state modifier class", (state) => {
    const { container } = render(
      <NodeMarker state={state} squareName={SQUARE_NAME} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("node-marker", `node-marker--${state}`);
  });

  it("is decorative: aria-hidden, no title or desc, and no accessible text", () => {
    const { container } = render(
      <NodeMarker state="inactive" squareName={SQUARE_NAME} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("title")).not.toBeInTheDocument();
    expect(container.querySelector("desc")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });

  it.each(STATES)("shares the same 100-unit viewBox for %s", (state) => {
    const { container } = render(
      <NodeMarker state={state} squareName={SQUARE_NAME} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 100 100");
  });

  it.each(CLOCKED_STATES)(
    "renders exactly one centred circle for %s",
    (state) => {
      const { container } = render(
        <NodeMarker state={state} squareName={SQUARE_NAME} />,
      );

      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(1);
      expect(circles[0]).toHaveAttribute("cx", "50");
      expect(circles[0]).toHaveAttribute("cy", "50");
    },
  );

  it.each(CLOCKED_STATES)(
    "draws %s's radius, gradient stops, colours and opacities as specified",
    (state) => {
      const { container } = render(
        <NodeMarker state={state} squareName={SQUARE_NAME} />,
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

  it.each(CLOCKED_STATES)(
    "fills %s's circle with a gradient id built from its square name",
    (state) => {
      const { container } = render(
        <NodeMarker state={state} squareName={SQUARE_NAME} />,
      );

      const circle = container.querySelector("circle");
      const gradient = container.querySelector("radialGradient");
      expect(gradient).toHaveAttribute("id", `node-${SQUARE_NAME}-fill`);
      expect(circle).toHaveAttribute("fill", `url(#node-${SQUARE_NAME}-fill)`);
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
        <NodeMarker
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
        <NodeMarker
          state="depleted"
          squareName={SQUARE_NAME}
          cyclePosition={cyclePosition}
        />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute("offset", expectedOffset);
    },
  );

  it.each(CLOCKED_STATES)(
    "falls back to %s's start-of-cycle offset when no cycle position is given",
    (state) => {
      const { container } = render(
        <NodeMarker state={state} squareName={SQUARE_NAME} />,
      );

      const stops = container.querySelectorAll("stop");
      expect(stops[1]).toHaveAttribute(
        "offset",
        EXPECTED_ARTWORK[state].stops[1].offset,
      );
    },
  );

  describe("an inactive node's rings", () => {
    it.each([
      { priority: 1, expectedRadii: INACTIVE_RING_RADII.slice(0, 1) },
      { priority: 2, expectedRadii: INACTIVE_RING_RADII.slice(0, 2) },
      { priority: 3, expectedRadii: INACTIVE_RING_RADII.slice(0, 3) },
    ] satisfies { priority: NodePriority; expectedRadii: readonly string[] }[])(
      "draws $priority ring(s) at the stated radii for priority $priority",
      ({ priority, expectedRadii }) => {
        const { container } = render(
          <NodeMarker
            state="inactive"
            squareName={SQUARE_NAME}
            priority={priority}
          />,
        );

        const circles = container.querySelectorAll("circle");
        expect(circles).toHaveLength(expectedRadii.length);
        expect(
          Array.from(circles, (circle) => circle.getAttribute("r")),
        ).toEqual(expectedRadii);
        for (const circle of circles) {
          expect(circle).toHaveAttribute("cx", "50");
          expect(circle).toHaveAttribute("cy", "50");
          expect(circle).toHaveAttribute("fill", "none");
          expect(circle).toHaveAttribute("stroke", INACTIVE_RING_COLOR);
          expect(circle).toHaveAttribute(
            "stroke-width",
            INACTIVE_RING_STROKE_WIDTH,
          );
        }
      },
    );

    it("draws no gradient at all, unlike the charged and depleted artwork", () => {
      const { container } = render(
        <NodeMarker state="inactive" squareName={SQUARE_NAME} priority={2} />,
      );

      expect(container.querySelector("radialGradient")).not.toBeInTheDocument();
      expect(container.querySelector("defs")).not.toBeInTheDocument();
    });

    it("degrades to a single ring, rather than throwing, when no priority is given", () => {
      const { container } = render(
        <NodeMarker state="inactive" squareName={SQUARE_NAME} />,
      );

      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(1);
      expect(circles[0]).toHaveAttribute("r", INACTIVE_RING_RADII[0]);
    });
  });

  describe("the charge animation", () => {
    function chargeAnimation(priority: NodePriority): NodeChargeAnimation {
      return { type: "node-charge", priority, runId: 7 };
    }

    it.each([
      {
        priority: 1 as NodePriority,
        expectedRadii: INACTIVE_RING_RADII.slice(0, 1),
      },
      {
        priority: 2 as NodePriority,
        expectedRadii: INACTIVE_RING_RADII.slice(0, 2),
      },
      {
        priority: 3 as NodePriority,
        expectedRadii: INACTIVE_RING_RADII.slice(0, 3),
      },
    ])(
      "draws $priority outgoing ring(s) at the stated radii for priority $priority, alongside the gradient and its mask",
      ({ priority, expectedRadii }) => {
        const { container } = render(
          <NodeMarker
            state="charged"
            squareName={SQUARE_NAME}
            chargeAnimation={chargeAnimation(priority)}
          />,
        );

        const rings = container.querySelectorAll(".node-marker__outgoing-ring");
        expect(Array.from(rings, (ring) => ring.getAttribute("r"))).toEqual(
          expectedRadii,
        );

        expect(container.querySelector("radialGradient")).toHaveAttribute(
          "id",
          `node-${SQUARE_NAME}-fill`,
        );
        const mask = container.querySelector("mask");
        expect(mask).toBeInTheDocument();
        expect(
          container.querySelector(".node-marker__charge-reveal"),
        ).toHaveAttribute("mask", `url(#${mask?.getAttribute("id")})`);
      },
    );

    it("draws no rings, mask or reveal group without a charge animation", () => {
      const { container } = render(
        <NodeMarker state="charged" squareName={SQUARE_NAME} />,
      );

      expect(
        container.querySelector(".node-marker__outgoing-ring"),
      ).not.toBeInTheDocument();
      expect(container.querySelector("mask")).not.toBeInTheDocument();
      expect(
        container.querySelector(".node-marker__charge-reveal"),
      ).not.toBeInTheDocument();
    });

    it("leaves a charged marker's end state exactly as if it never animated", () => {
      const { container, rerender } = render(
        <NodeMarker
          state="charged"
          squareName={SQUARE_NAME}
          chargeAnimation={chargeAnimation(2)}
        />,
      );

      rerender(<NodeMarker state="charged" squareName={SQUARE_NAME} />);

      const plain = render(
        <NodeMarker state="charged" squareName={SQUARE_NAME} />,
      );

      expect(container.innerHTML).toBe(plain.container.innerHTML);
    });
  });

  describe("the burnout animation", () => {
    const BURNOUT_ANIMATION: NodeBurnoutAnimation = {
      type: "node-burnout",
      runId: 3,
    };

    it("draws the ordinary depleted artwork plus the burning-out modifier class", () => {
      const { container } = render(
        <NodeMarker
          state="depleted"
          squareName={SQUARE_NAME}
          burnoutAnimation={BURNOUT_ANIMATION}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("node-marker", "node-marker--depleted");
      expect(svg).toHaveClass("node-marker--burning-out");

      const circle = container.querySelector("circle");
      expect(circle).toHaveAttribute("r", EXPECTED_ARTWORK.depleted.radius);
      const stops = container.querySelectorAll("stop");
      expect(stops).toHaveLength(EXPECTED_ARTWORK.depleted.stops.length);
      EXPECTED_ARTWORK.depleted.stops.forEach((expectedStop, index) => {
        expect(stops[index]).toHaveAttribute("offset", expectedStop.offset);
        expect(stops[index]).toHaveAttribute(
          "stop-opacity",
          expectedStop.opacity,
        );
      });
    });

    it("gives each stop the depleted colour as its own base value and the charged colour at that same position as its travel-from custom property", () => {
      const { container } = render(
        <NodeMarker
          state="depleted"
          squareName={SQUARE_NAME}
          burnoutAnimation={BURNOUT_ANIMATION}
        />,
      );

      const stops = Array.from(container.querySelectorAll("stop"));
      expect(stops).toHaveLength(3);
      stops.forEach((stop, index) => {
        expect(stop).toHaveClass("node-marker__burnout-stop");
        expect(
          (stop as unknown as HTMLElement).style.getPropertyValue("stop-color"),
        ).toBe(hexToRgb(EXPECTED_ARTWORK.depleted.stops[index].color));
        expect(
          (stop as unknown as HTMLElement).style.getPropertyValue(
            "--node-burnout-from",
          ),
        ).toBe(EXPECTED_ARTWORK.charged.stops[index].color);
        expect(stop).not.toHaveAttribute("stop-color");
      });
    });

    it("draws no burning-out class or per-stop style without a burnout animation", () => {
      const { container } = render(
        <NodeMarker state="depleted" squareName={SQUARE_NAME} />,
      );

      expect(container.querySelector("svg")).not.toHaveClass(
        "node-marker--burning-out",
      );
      expect(
        container.querySelector(".node-marker__burnout-stop"),
      ).not.toBeInTheDocument();
    });

    it("leaves a depleted marker's end state exactly as if it never animated", () => {
      const { container, rerender } = render(
        <NodeMarker
          state="depleted"
          squareName={SQUARE_NAME}
          burnoutAnimation={BURNOUT_ANIMATION}
        />,
      );

      rerender(<NodeMarker state="depleted" squareName={SQUARE_NAME} />);

      const plain = render(
        <NodeMarker state="depleted" squareName={SQUARE_NAME} />,
      );

      expect(container.innerHTML).toBe(plain.container.innerHTML);
    });
  });

  it("reports no axe violations for any state", async () => {
    for (const state of STATES) {
      const { container } = render(
        <NodeMarker state={state} squareName={SQUARE_NAME} priority={3} />,
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
