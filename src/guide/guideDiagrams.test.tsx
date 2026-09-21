// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  MovementDiagram,
  NodeLifecycleDiagram,
  NodeSelectionDiagram,
  PlanetBonusDiagram,
  RefuellingDiagram,
  RotatorSquareDiagram,
  ScoringDiagram,
} from "./guideDiagrams";

afterEach(cleanup);

function litGaugeSlotCounts(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll(selector)).map(
    (ship) => ship.querySelectorAll('[data-gauge-lit="true"]').length,
  );
}

describe("ScoringDiagram", () => {
  it("draws a six-column, three-row table: node counts, then simple's and bonus's payouts", () => {
    const { container } = render(<ScoringDiagram />);

    // Eighteen table cells plus the legend line spanning them.
    const cells = container.querySelectorAll(".guide-diagram__cell");
    expect(cells).toHaveLength(19);

    const labels = Array.from(
      container.querySelectorAll(".guide-diagram__label"),
    ).map((label) => label.textContent);
    expect(labels).toEqual([
      "NODES",
      "1",
      "2",
      "3",
      "4",
      "5",
      "SIMPLE",
      "1",
      "2",
      "3",
      "4",
      "5",
      "BONUS",
      "1",
      "3",
      "6",
      "10",
      "15",
    ]);

    expect(container.querySelector(".board-square")).toBeNull();
    expect(container.querySelectorAll(".guide-diagram__arrow")).toHaveLength(0);
    expect(container.querySelectorAll(".guide-diagram__note")).toHaveLength(0);
  });

  it("separates the heading row from the figures with one line spanning every column", () => {
    const { container } = render(<ScoringDiagram />);

    expect(container.querySelectorAll(".guide-diagram__rule")).toHaveLength(1);

    // The line follows the six heading cells, so it sits between the node
    // counts and SIMPLE's row rather than anywhere else in the table.
    const cells = Array.from(
      container.querySelectorAll(".guide-diagram__cell"),
    );
    const ruleIndex = cells.findIndex((cell) =>
      cell.classList.contains("guide-diagram__cell--rule"),
    );
    expect(ruleIndex).toBe(6);
  });
});

describe("MovementDiagram", () => {
  it("draws thirty-seven squares with the centre at full fuel and no number", () => {
    const { container } = render(<MovementDiagram />);

    expect(container.querySelectorAll(".board-square")).toHaveLength(37);

    const greenShips = container.querySelectorAll(".ship-model--green");
    expect(greenShips).toHaveLength(1);
    expect(
      greenShips[0].querySelectorAll('[data-gauge-lit="true"]'),
    ).toHaveLength(6);

    const numbers = Array.from(
      container.querySelectorAll(".guide-diagram__number"),
    ).map((node) => node.textContent);
    expect(numbers.filter((value) => value === "0")).toHaveLength(4);
    expect(numbers.filter((value) => value === "1")).toHaveLength(4);
    expect(numbers.filter((value) => value === "2")).toHaveLength(12);
    expect(numbers.filter((value) => value === "3")).toHaveLength(16);
    expect(numbers).toHaveLength(36);

    // 49 cells: 1 centre + 36 numbered + 12 blank.
    const cells = container.querySelectorAll(".guide-diagram__cell");
    expect(cells).toHaveLength(49);
    const emptyCells = Array.from(cells).filter(
      (cell) => cell.querySelector(".board-square") === null,
    );
    expect(emptyCells).toHaveLength(12);

    expect(container.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });
});

describe("RefuellingDiagram", () => {
  it("shows a ship gaining fuel on a planet, with an arrow between", () => {
    const { container } = render(<RefuellingDiagram />);

    const planetSquares = container.querySelectorAll(".board-square--planet");
    expect(planetSquares).toHaveLength(2);
    for (const square of planetSquares) {
      expect(square.querySelector(".planet")).toBeInTheDocument();
    }

    const litCounts = litGaugeSlotCounts(container, ".ship-model--green");
    expect(litCounts).toEqual([4, 6]);

    expect(container.querySelectorAll(".guide-diagram__arrow")).toHaveLength(1);
    expect(container.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });
});

describe("NodeLifecycleDiagram", () => {
  it("shows a charged node at 1 becoming a depleted node at 5, same ship throughout", () => {
    const { container } = render(<NodeLifecycleDiagram />);

    const charged = container.querySelector(".node-marker--charged");
    const depleted = container.querySelector(".node-marker--depleted");
    expect(charged).toBeInTheDocument();
    expect(depleted).toBeInTheDocument();

    const chargedSquare = charged?.closest(".board-square");
    const depletedSquare = depleted?.closest(".board-square");
    expect(chargedSquare?.querySelector(".node-countdown")?.textContent).toBe(
      "1",
    );
    expect(depletedSquare?.querySelector(".node-countdown")?.textContent).toBe(
      "5",
    );

    const greenShips = container.querySelectorAll(".ship-model--green");
    expect(greenShips).toHaveLength(2);
    const litCounts = litGaugeSlotCounts(container, ".ship-model--green");
    expect(litCounts[0]).toBe(litCounts[1]);

    expect(container.querySelectorAll(".guide-diagram__arrow")).toHaveLength(1);
    expect(container.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });
});

describe("NodeSelectionDiagram", () => {
  it("shows one indicator rotating through three, one, two, three rings", () => {
    const { container } = render(<NodeSelectionDiagram />);

    const markers = container.querySelectorAll(".node-marker--inactive");
    expect(markers).toHaveLength(4);
    const ringCounts = Array.from(markers).map(
      (marker) => marker.querySelectorAll("circle").length,
    );
    expect(ringCounts).toEqual([3, 1, 2, 3]);

    expect(container.querySelectorAll(".guide-diagram__arrow")).toHaveLength(3);
    expect(container.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });
});

describe("RotatorSquareDiagram", () => {
  it("shows a single square holding only a rotator", () => {
    const { container } = render(<RotatorSquareDiagram />);

    expect(container.querySelectorAll(".guide-diagram__cell")).toHaveLength(1);
    expect(container.querySelectorAll(".board-square")).toHaveLength(1);
    expect(container.querySelectorAll(".rotator-marker")).toHaveLength(1);
    expect(container.querySelector(".node-marker")).toBeNull();
    expect(container.querySelector(".ship-model")).toBeNull();
  });
});

describe("PlanetBonusDiagram", () => {
  it("shows green's row alone — three planets, one already claimed", () => {
    const { container } = render(<PlanetBonusDiagram />);

    expect(container.querySelectorAll(".guide-diagram__cell")).toHaveLength(3);
    expect(container.querySelectorAll(".planet")).toHaveLength(3);
    expect(
      container.querySelectorAll(".planet-bonus-cell__checkmark"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".planet-bonus-cell__badge--green"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".planet-bonus-cell__badge--red"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".planet-bonus-cell__badge--amount"),
    ).toHaveLength(0);
    expect(container.querySelectorAll(".guide-diagram__arrow")).toHaveLength(0);
  });
});
