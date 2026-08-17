// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_SQUARES, squareAt } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
import { STARTING_FLEET, startingShipAt } from "../rules/fleet";
import { startingSiteState } from "../rules/sites";
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

    // H8 is the centre square and an active site at the start.
    expect(
      screen.getByRole("gridcell", { name: "H8, active site" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every bay with 'bay' and no other square", () => {
    render(<Board />);

    // A handful of squares, checked against squareLabel directly (the module
    // squareLabel.test.ts pins the exact wording) rather than restating a
    // ship's shield count here, which the fleet's fixture varies.
    for (const square of [
      squareAt("D", 15),
      squareAt("H", 15),
      squareAt("A", 10),
    ]) {
      const label = squareLabel({
        square,
        isBay: isBay(square),
        siteState: startingSiteState(square),
        occupant: startingShipAt(square),
      });
      expect(screen.getByRole("gridcell", { name: label })).toBeInTheDocument();
    }

    for (const square of ALL_SQUARES) {
      const label = squareLabel({
        square,
        isBay: isBay(square),
        siteState: startingSiteState(square),
        occupant: startingShipAt(square),
      });
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

    for (const entry of STARTING_FLEET) {
      const cell = screen.getByRole("gridcell", {
        name: squareLabel({
          square: entry.square,
          isBay: isBay(entry.square),
          siteState: startingSiteState(entry.square),
          occupant: entry,
        }),
      });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", { name: /ship, \d+ shields?$/ }),
    ).toHaveLength(STARTING_FLEET.length);
  });

  it("hides the ship artwork from the accessibility tree", () => {
    render(<Board />);

    const square = squareAt("H", 15);
    const label = squareLabel({
      square,
      isBay: isBay(square),
      siteState: startingSiteState(square),
      occupant: startingShipAt(square),
    });
    const cell = screen.getByRole("gridcell", { name: label });
    expect(cell).toHaveAccessibleName(label);
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

  describe("sites on the starting board", () => {
    // Literal, hand-transcribed from rules.md §3.2 and §8.1, not derived by
    // calling the same production lookups the component uses.
    const SITE_SQUARES = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "E5",
      "K5",
      "D8",
      "H8",
      "L8",
      "E11",
      "K11",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];
    const ACTIVE_SITE_SQUARES = ["H8", "E5", "K5", "E11", "K11"];
    const DORMANT_SITE_SQUARES = SITE_SQUARES.filter(
      (square) => !ACTIVE_SITE_SQUARES.includes(square),
    );

    it("draws a site marker on exactly the seventeen sites from rules.md §3.2", () => {
      const { container } = render(<Board />);

      expect(container.querySelectorAll(".site-marker")).toHaveLength(17);
      for (const square of ACTIVE_SITE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, active site`,
        });
        expect(cell.querySelector(".site-marker")).toBeInTheDocument();
      }
      for (const square of DORMANT_SITE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, dormant site`,
        });
        expect(cell.querySelector(".site-marker")).toBeInTheDocument();
      }
    });

    it("names exactly five sites active and twelve dormant, none charged or depleted", () => {
      render(<Board />);

      expect(
        screen.getAllByRole("gridcell", { name: /, active site$/ }),
      ).toHaveLength(5);
      expect(
        screen.getAllByRole("gridcell", { name: /, dormant site$/ }),
      ).toHaveLength(12);
      expect(
        screen.queryByRole("gridcell", { name: /charged site/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("gridcell", { name: /depleted site/ }),
      ).not.toBeInTheDocument();
    });

    it("spot-checks a few sites' literal accessible names", () => {
      render(<Board />);

      expect(
        screen.getByRole("gridcell", { name: "E5, active site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "H8, active site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "B4, dormant site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "F2, dormant site" }),
      ).toBeInTheDocument();
    });

    it("never draws a site marker on a bay, and never names a bay a site", () => {
      const { container } = render(<Board />);

      const bayElements = container.querySelectorAll(".board-square--bay");
      expect(bayElements).toHaveLength(BAYS.length);
      for (const bayElement of bayElements) {
        expect(bayElement.querySelector(".site-marker")).toBeNull();
      }
      expect(
        screen.queryByRole("gridcell", { name: /bay.*site|site.*bay/ }),
      ).not.toBeInTheDocument();
    });
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
