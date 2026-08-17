// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_SQUARES, squareName } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
import { STARTING_FLEET, startingShipAt } from "../rules/fleet";
import { Board } from "./Board";
import { squareLabel } from "./squareLabel";

afterEach(cleanup);

describe("Board", () => {
  it("renders 225 gridcells in 15 rows", () => {
    render(<Board />);

    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
  });

  it("draws A15 first and O1 last in DOM order", () => {
    render(<Board />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAccessibleName("A15");
    expect(cells[cells.length - 1]).toHaveAccessibleName("O1");
  });

  it("names the centre and the far corners correctly", () => {
    render(<Board />);

    expect(screen.getByRole("gridcell", { name: "H8" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every bay with 'bay' and no other square", () => {
    render(<Board />);

    // A handful of literal expected names, independent of the production
    // label-building functions the completeness loop below re-uses to build
    // its own expectations.
    expect(
      screen.getByRole("gridcell", { name: "D15, bay, red ship, 0 shields" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", {
        name: "H15, bay, green ship, 0 shields",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "A10, bay, red ship, 0 shields" }),
    ).toBeInTheDocument();

    for (const square of ALL_SQUARES) {
      const label = squareLabel(square, isBay(square), startingShipAt(square));
      const cell = screen.getByRole("gridcell", { name: label });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", {
        name: /, bay(, .+ ship, \d+ shields?)?$/,
      }),
    ).toHaveLength(BAYS.length);
  });

  it("marks the fourteen bay cells distinctly and draws different silhouettes per side", () => {
    const { container } = render(<Board />);

    expect(container.querySelectorAll(".board-square--bay")).toHaveLength(
      BAYS.length,
    );

    const greenPath = container.querySelector(".ship-icon--green path");
    const redPath = container.querySelector(".ship-icon--red path");
    expect(greenPath).toHaveAttribute("d");
    expect(redPath).toHaveAttribute("d");
    expect(greenPath?.getAttribute("d")).not.toBe(redPath?.getAttribute("d"));
  });

  it("names each starting ship's square with its side, and no other square", () => {
    render(<Board />);

    for (const { square, side, shields } of STARTING_FLEET) {
      const cell = screen.getByRole("gridcell", {
        name: `${squareName(square)}, bay, ${side} ship, ${shields} shields`,
      });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", { name: /ship, \d+ shields?$/ }),
    ).toHaveLength(STARTING_FLEET.length);
  });

  it("hides the ship artwork from the accessibility tree", () => {
    render(<Board />);

    const cell = screen.getByRole("gridcell", {
      name: "H15, bay, green ship, 0 shields",
    });
    expect(cell).toHaveAccessibleName("H15, bay, green ship, 0 shields");
    const svg = cell.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  it("draws visible column letters and row numbers, hidden from the accessibility tree", () => {
    const { container } = render(<Board />);

    // The grid itself is unaffected: still 225 cells, none of them the labels.
    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("rowheader")).not.toBeInTheDocument();

    const rowLabels = container.querySelector(".board-frame__row-labels");
    const columnLabels = container.querySelector(".board-frame__column-labels");
    expect(rowLabels).toHaveAttribute("aria-hidden", "true");
    expect(columnLabels).toHaveAttribute("aria-hidden", "true");

    // The letters and numbers are drawn in the DOM, in board order, but their
    // `aria-hidden` ancestor (asserted above) removes them from the
    // accessibility tree entirely.
    expect(rowLabels?.textContent).toBe(
      Array.from({ length: 15 }, (_, index) => 15 - index).join(""),
    );
    expect(columnLabels?.textContent).toBe("ABCDEFGHIJKLMNO");
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(<Board />);

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
