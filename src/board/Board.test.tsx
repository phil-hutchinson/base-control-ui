// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_SQUARES } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
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

    for (const square of ALL_SQUARES) {
      const label = squareLabel(square, isBay(square), undefined);
      const cell = screen.getByRole("gridcell", { name: label });
      expect(cell).toBeInTheDocument();
    }
    expect(screen.getAllByRole("gridcell", { name: /, bay$/ })).toHaveLength(
      BAYS.length,
    );
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
