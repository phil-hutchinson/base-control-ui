// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  MovementDiagram,
  NodeLifecycleDiagram,
  NodeSelectionDiagram,
  RefuellingDiagram,
  ScoringDiagram,
} from "./guideDiagrams";

afterEach(cleanup);

function litGaugeSlotCounts(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll(selector)).map(
    (ship) => ship.querySelectorAll('[data-gauge-lit="true"]').length,
  );
}

describe("ScoringDiagram", () => {
  it("shows three charged nodes, three ships at different fuel levels, and +3", () => {
    const { container, getByText } = render(<ScoringDiagram />);

    expect(container.querySelectorAll(".node-marker--charged")).toHaveLength(3);
    expect(
      Array.from(container.querySelectorAll(".node-countdown")).map(
        (node) => node.textContent,
      ),
    ).toEqual(["3", "1", "2"]);

    const greenShips = container.querySelectorAll(".ship-model--green");
    expect(greenShips).toHaveLength(3);
    const litCounts = litGaugeSlotCounts(container, ".ship-model--green");
    expect(new Set(litCounts).size).toBe(3);

    expect(getByText("+3")).toBeInTheDocument();
    expect(container.querySelectorAll(".ship-model--red")).toHaveLength(0);
  });
});

describe("MovementDiagram", () => {
  it("draws twenty-one squares with the centre at full fuel and no number", () => {
    const { container } = render(<MovementDiagram />);

    expect(container.querySelectorAll(".board-square")).toHaveLength(21);

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
    expect(numbers).toHaveLength(20);

    // 25 cells: 1 centre + 20 numbered + 4 blank corners.
    const cells = container.querySelectorAll(".guide-diagram__cell");
    expect(cells).toHaveLength(25);
    const emptyCells = Array.from(cells).filter(
      (cell) => cell.querySelector(".board-square") === null,
    );
    expect(emptyCells).toHaveLength(4);

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
