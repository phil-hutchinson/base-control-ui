// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { PowerLevel } from "../rules/power";
import { squareLabel } from "../board/squareLabel";
import { GAUGE_SLOT_COUNT, SHIP_ART } from "./shipArt";
import { ShipModel } from "./ShipModel";

afterEach(cleanup);

const POWER_LEVELS: readonly PowerLevel[] = [0, 1, 2, 3, 4];
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
    "draws four gauge slots in order, %i lit left to right",
    (power) => {
      const { container } = render(<ShipModel side="green" power={power} />);

      const slots = container.querySelectorAll("[data-gauge-slot]");
      expect(slots).toHaveLength(GAUGE_SLOT_COUNT);
      expect(
        Array.from(slots).map((slot) => slot.getAttribute("data-gauge-slot")),
      ).toEqual(["0", "1", "2", "3"]);

      const litFlags = Array.from(slots).map(
        (slot) => slot.getAttribute("data-gauge-lit") === "true",
      );
      expect(litFlags.filter(Boolean)).toHaveLength(power);
      expect(litFlags).toEqual([0, 1, 2, 3].map((index) => index < power));
    },
  );

  it.each(POWER_LEVELS)("draws bars only on lit slots, %i lit", (power) => {
    const { container } = render(<ShipModel side="red" power={power} />);

    const slots = container.querySelectorAll("[data-gauge-slot]");
    slots.forEach((slot) => {
      const lit = slot.getAttribute("data-gauge-lit") === "true";
      expect(slot.querySelectorAll("line")).toHaveLength(lit ? 2 : 0);
    });
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
            isBay: false,
            occupant: { side, power },
          });
          const { container } = render(<ShipModel side={side} power={power} />);

          const litSlots = container.querySelectorAll(
            '[data-gauge-lit="true"]',
          );
          expect(litSlots).toHaveLength(power);

          expect(label).toBe(`H8, ${side} ship, power ${power} of 4`);
        },
      );
    }
  });
});
