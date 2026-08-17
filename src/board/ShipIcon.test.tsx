// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { ShieldCount } from "../rules/shields";
import { ARC_FILL_ORDER } from "./shieldArcs";
import { ShipIcon } from "./ShipIcon";

afterEach(cleanup);

const SHIELD_COUNTS: readonly ShieldCount[] = [0, 1, 2, 3, 4];

describe("ShipIcon", () => {
  it.each(SHIELD_COUNTS)("draws %i arc(s) in fill order", (shields) => {
    const { container } = render(<ShipIcon side="green" shields={shields} />);

    const arcs = container.querySelectorAll("[data-arc-position]");
    expect(arcs).toHaveLength(shields);
    expect(
      Array.from(arcs).map((arc) => arc.getAttribute("data-arc-position")),
    ).toEqual(ARC_FILL_ORDER.slice(0, shields));
  });

  it("draws the green and red hulls as different silhouettes", () => {
    const { container: greenContainer } = render(
      <ShipIcon side="green" shields={0} />,
    );
    const { container: redContainer } = render(
      <ShipIcon side="red" shields={0} />,
    );

    const greenPath = greenContainer.querySelector(".ship-icon--green path");
    const redPath = redContainer.querySelector(".ship-icon--red path");
    expect(greenPath).toHaveAttribute("d");
    expect(redPath).toHaveAttribute("d");
    expect(greenPath?.getAttribute("d")).not.toBe(redPath?.getAttribute("d"));
  });

  it("stays hidden from the accessibility tree even with arcs drawn", () => {
    const { container } = render(<ShipIcon side="red" shields={4} />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  it("has no static accessibility violations at any shield count", async () => {
    for (const shields of SHIELD_COUNTS) {
      const { container, unmount } = render(
        <ShipIcon side="green" shields={shields} />,
      );

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
      unmount();
    }
  });
});
