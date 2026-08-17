// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_SQUARES, squareName } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
import { STARTING_FLEET } from "../rules/fleet";
import { Board } from "./Board";
import { reviewOccupantAt, reviewSiteStateAt } from "./reviewFixture";
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

    // H8 is the centre; the temporary review fixture (step 8) makes it a
    // charged site holding an extra green ship.
    expect(
      screen.getByRole("gridcell", { name: "H8, charged site, green ship" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every bay with 'bay' and no other square", () => {
    render(<Board />);

    // A handful of literal expected names, independent of the production
    // label-building functions the completeness loop below re-uses to build
    // its own expectations.
    expect(
      screen.getByRole("gridcell", { name: "D15, bay, red ship" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "H15, bay, green ship" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "A10, bay, red ship" }),
    ).toBeInTheDocument();

    for (const square of ALL_SQUARES) {
      const label = squareLabel({
        square,
        isBay: isBay(square),
        siteState: reviewSiteStateAt(square),
        occupant: reviewOccupantAt(square),
      });
      const cell = screen.getByRole("gridcell", { name: label });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", { name: /, bay(, .+ ship)?$/ }),
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

    for (const { square, side } of STARTING_FLEET) {
      const cell = screen.getByRole("gridcell", {
        name: `${squareName(square)}, bay, ${side} ship`,
      });
      expect(cell).toBeInTheDocument();
    }
    // The temporary review fixture (step 8) adds four more ships standing on
    // sites, on top of the fourteen in their bays.
    expect(screen.getAllByRole("gridcell", { name: /ship$/ })).toHaveLength(
      STARTING_FLEET.length + 4,
    );
  });

  it("hides the ship artwork from the accessibility tree", () => {
    render(<Board />);

    const cell = screen.getByRole("gridcell", {
      name: "H15, bay, green ship",
    });
    expect(cell).toHaveAccessibleName("H15, bay, green ship");
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

  // TEMPORARY (story 00000003, step 8): the review fixture puts all four
  // site states, and a ship standing on one of each, on screen at once. This
  // whole describe block is deleted in step 11, along with reviewFixture.ts,
  // and replaced with assertions on the real starting state.
  describe("the temporary review fixture", () => {
    // Literal, hand-transcribed from the fixture arrangement (reviewFixture.ts),
    // not derived by calling the same production lookups the component uses.
    const CHARGED_SITE_SQUARES = ["H8"];
    const DEPLETED_SITE_SQUARES = ["H4", "H12"];
    const ACTIVE_SITE_SQUARES = ["E5", "K5", "E11", "K11"];
    const DORMANT_SITE_SQUARES = [
      "F2",
      "J2",
      "B4",
      "N4",
      "D8",
      "L8",
      "B12",
      "N12",
      "F14",
      "J14",
    ];

    it("shows the one charged site, with its extra green ship", () => {
      render(<Board />);

      expect(
        screen.getByRole("gridcell", { name: "H8, charged site, green ship" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("gridcell", { name: /, charged site/ }),
      ).toHaveLength(CHARGED_SITE_SQUARES.length);
    });

    it("shows the two depleted sites, one with its extra red ship", () => {
      render(<Board />);

      expect(
        screen.getByRole("gridcell", { name: "H4, depleted site, red ship" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "H12, depleted site" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("gridcell", { name: /, depleted site/ }),
      ).toHaveLength(DEPLETED_SITE_SQUARES.length);
    });

    it("shows the four active sites, one with its extra green ship", () => {
      render(<Board />);

      expect(
        screen.getByRole("gridcell", { name: "E5, active site, green ship" }),
      ).toBeInTheDocument();
      for (const square of ACTIVE_SITE_SQUARES) {
        expect(
          screen.getByRole("gridcell", {
            name: new RegExp(`^${square}, active site`),
          }),
        ).toBeInTheDocument();
      }
      expect(
        screen.getAllByRole("gridcell", { name: /, active site/ }),
      ).toHaveLength(ACTIVE_SITE_SQUARES.length);
    });

    it("shows the ten dormant sites, one with its extra red ship", () => {
      render(<Board />);

      expect(
        screen.getByRole("gridcell", { name: "B4, dormant site, red ship" }),
      ).toBeInTheDocument();
      for (const square of DORMANT_SITE_SQUARES) {
        expect(
          screen.getByRole("gridcell", {
            name: new RegExp(`^${square}, dormant site`),
          }),
        ).toBeInTheDocument();
      }
      expect(
        screen.getAllByRole("gridcell", { name: /, dormant site/ }),
      ).toHaveLength(DORMANT_SITE_SQUARES.length);
    });

    it("draws seventeen site markers in total, one per site, with all four state classes present", () => {
      const { container } = render(<Board />);

      expect(container.querySelectorAll(".site-marker")).toHaveLength(17);
      for (const state of ["dormant", "active", "charged", "depleted"]) {
        expect(
          container.querySelectorAll(`.site-marker--${state}`).length,
        ).toBeGreaterThan(0);
      }
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
