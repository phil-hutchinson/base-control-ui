// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { PowerLevel } from "../rules/power";
import { squareLabel } from "../board/squareLabel";
import { GAUGE_BAR_STROKE_WIDTH, GAUGE_PALETTE, SHIP_ART } from "./shipArt";
import { ShipModel } from "./ShipModel";

afterEach(cleanup);

const POWER_LEVELS: readonly PowerLevel[] = [0, 1, 2, 3, 4, 5, 6];
const SIDES: readonly Side[] = ["green", "red"];

describe("ShipModel", () => {
  it("draws each side's own hull, and the two differ", () => {
    const { container: greenContainer } = render(<ShipModel side="green" />);
    const { container: redContainer } = render(<ShipModel side="red" />);

    const greenUse = greenContainer.querySelector("svg > use");
    const redUse = redContainer.querySelector("svg > use");
    expect(greenUse).toHaveAttribute("href", `#${SHIP_ART.green.hullId}`);
    expect(redUse).toHaveAttribute("href", `#${SHIP_ART.red.hullId}`);
    expect(greenUse?.getAttribute("href")).not.toBe(
      redUse?.getAttribute("href"),
    );
  });

  it("draws no gauge at all when no power level is given", () => {
    const { container } = render(<ShipModel side="green" />);

    expect(container.querySelectorAll("[data-gauge-slot]")).toHaveLength(0);
  });

  it.each(POWER_LEVELS)(
    "draws exactly the lit slots, in reading order, and nothing for the rest, %i lit",
    (power) => {
      const { container } = render(<ShipModel side="green" power={power} />);

      const slots = container.querySelectorAll("[data-gauge-slot]");
      expect(slots).toHaveLength(power);
      expect(
        Array.from(slots).map((slot) => slot.getAttribute("data-gauge-slot")),
      ).toEqual(Array.from({ length: power }, (_, index) => String(index)));
      expect(
        Array.from(slots).every(
          (slot) => slot.getAttribute("data-gauge-lit") === "true",
        ),
      ).toBe(true);
    },
  );

  it.each(POWER_LEVELS)(
    "draws exactly two lines per lit slot, an underlay then the bar colour at the bar stroke, %i lit",
    (power) => {
      const { container } = render(<ShipModel side="red" power={power} />);

      const slots = container.querySelectorAll("[data-gauge-slot]");
      slots.forEach((slot) => {
        const lines = slot.querySelectorAll("line");
        expect(lines).toHaveLength(2);
        expect(lines[1]).toHaveAttribute("stroke", GAUGE_PALETTE.red.barColor);
        expect(lines[1]).toHaveAttribute(
          "stroke-width",
          String(GAUGE_BAR_STROKE_WIDTH),
        );
      });
    },
  );

  it("draws a 0-power ship with no gauge marks at all, reading the same as no power level given", () => {
    const { container } = render(<ShipModel side="green" power={0} />);

    expect(container.querySelectorAll("[data-gauge-slot]")).toHaveLength(0);
    expect(container.querySelectorAll("line")).toHaveLength(0);
  });

  it("stays hidden from the accessibility tree, gauge or not", () => {
    const { container } = render(<ShipModel side="red" power={4} />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  describe("alongside squareLabel", () => {
    for (const side of SIDES) {
      it.each(POWER_LEVELS)(
        `draws %i lit slot(s) that match the spoken power level for a ${side} ship`,
        (power) => {
          const label = squareLabel({
            square: squareAt("H", 8),
            isPlanet: false,
            occupant: { side, power },
          });
          const { container } = render(<ShipModel side={side} power={power} />);

          const litSlots = container.querySelectorAll(
            '[data-gauge-lit="true"]',
          );
          expect(litSlots).toHaveLength(power);

          expect(label).toBe(`H8, ${side} ship, power ${power} of 6`);
        },
      );
    }
  });
});
