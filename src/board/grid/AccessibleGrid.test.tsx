// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { AccessibleGrid, type GridCellDescriptor } from "./AccessibleGrid.tsx";

afterEach(cleanup);

// A 2x3 fixture: row 0 is A (focusable), B (not focusable - tests the skip
// policy), C (focusable); row 1 is D, E, F, all focusable.
const rows: readonly (readonly GridCellDescriptor[])[] = [
  [
    { label: "A", focusable: true },
    { label: "B", focusable: false },
    { label: "C", focusable: true },
  ],
  [
    { label: "D", focusable: true },
    { label: "E", focusable: true },
    { label: "F", focusable: true },
  ],
];

function cell(name: string): HTMLElement {
  return screen.getByRole("gridcell", { name });
}

describe("AccessibleGrid", () => {
  it("exposes the grid, row, and gridcell structure with accessible names", () => {
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    const grid = screen.getByRole("grid", { name: "Fixture grid" });
    expect(within(grid).getAllByRole("row")).toHaveLength(2);
    for (const label of ["A", "B", "C", "D", "E", "F"]) {
      expect(cell(label)).toBeInTheDocument();
    }
  });

  it("makes exactly one focusable cell a tab stop, starting at the first focusable cell", () => {
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    expect(cell("A")).toHaveAttribute("tabIndex", "0");
    for (const label of ["C", "D", "E", "F"]) {
      expect(cell(label)).toHaveAttribute("tabIndex", "-1");
    }
    // A non-focusable cell takes no part in roving tabindex at all.
    expect(cell("B")).not.toHaveAttribute("tabIndex");
  });

  it("moves focus one cell per arrow key and clamps at the edges", async () => {
    const user = userEvent.setup();
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    cell("A").focus();
    expect(cell("A")).toHaveFocus();

    await user.keyboard("[ArrowDown]");
    expect(cell("D")).toHaveFocus();
    expect(cell("A")).toHaveAttribute("tabIndex", "-1");
    expect(cell("D")).toHaveAttribute("tabIndex", "0");

    await user.keyboard("[ArrowUp]");
    expect(cell("A")).toHaveFocus();

    // Clamped: nothing above row 0 or left of column 0.
    await user.keyboard("[ArrowUp]");
    expect(cell("A")).toHaveFocus();
    await user.keyboard("[ArrowLeft]");
    expect(cell("A")).toHaveFocus();
  });

  it("syncs the roving target when a cell is focused directly, not via arrow keys", async () => {
    const user = userEvent.setup();
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    // Simulates focus arriving on a cell other than the roving target
    // (e.g. a mouse click, which jsdom does not itself produce).
    act(() => {
      cell("D").focus();
    });
    expect(cell("D")).toHaveAttribute("tabIndex", "0");
    expect(cell("A")).toHaveAttribute("tabIndex", "-1");

    await user.keyboard("[ArrowRight]");
    expect(cell("E")).toHaveFocus();
  });

  it("skips a non-focusable cell in the arrow-key path", async () => {
    const user = userEvent.setup();
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    cell("A").focus();
    await user.keyboard("[ArrowRight]");

    expect(cell("C")).toHaveFocus();
  });

  it("reaches the grid in a single tab stop", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>before</button>
        <AccessibleGrid label="Fixture grid" rows={rows} />
        <button>after</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();

    await user.tab();
    expect(cell("A")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("does not steal focus on mount", () => {
    render(
      <>
        <button>elsewhere</button>
        <AccessibleGrid label="Fixture grid" rows={rows} />
      </>,
    );

    expect(cell("A")).not.toHaveFocus();
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(
      <AccessibleGrid label="Fixture grid" rows={rows} />,
    );

    const results = await axe.run(container, {
      rules: {
        // jsdom has no layout or canvas, so this rule cannot produce a
        // meaningful result here and instead prints a spurious
        // getContext-not-implemented error to stderr.
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
