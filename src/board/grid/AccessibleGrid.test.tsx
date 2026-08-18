// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("calls onActivate once with a cell's position when it is clicked", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <AccessibleGrid
        label="Fixture grid"
        rows={rows}
        onActivate={onActivate}
      />,
    );

    await user.click(cell("D"));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith({ row: 1, column: 0 });
  });

  it("calls onActivate with the focused position on Enter and on Space", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <AccessibleGrid
        label="Fixture grid"
        rows={rows}
        onActivate={onActivate}
      />,
    );

    cell("A").focus();
    await user.keyboard("[Enter]");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenLastCalledWith({ row: 0, column: 0 });

    await user.keyboard("[ArrowDown]");
    await user.keyboard("[Space]");
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenLastCalledWith({ row: 1, column: 0 });
  });

  it("prevents Space's default action so the page does not scroll", () => {
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    cell("A").focus();
    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    cell("A").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not call onActivate for arrow keys, and still moves focus", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <AccessibleGrid
        label="Fixture grid"
        rows={rows}
        onActivate={onActivate}
      />,
    );

    cell("A").focus();
    await user.keyboard("[ArrowDown]");

    expect(cell("D")).toHaveFocus();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("calls onDismiss on Escape, and no other key does", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AccessibleGrid label="Fixture grid" rows={rows} onDismiss={onDismiss} />,
    );

    cell("A").focus();
    await user.keyboard("[ArrowDown]");
    await user.keyboard("[Enter]");
    expect(onDismiss).not.toHaveBeenCalled();

    await user.keyboard("[Escape]");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("behaves exactly as before when neither prop is supplied", async () => {
    const user = userEvent.setup();
    render(<AccessibleGrid label="Fixture grid" rows={rows} />);

    cell("A").focus();
    await expect(user.keyboard("[Enter]")).resolves.not.toThrow();
    await expect(user.keyboard("[Space]")).resolves.not.toThrow();
    await expect(user.keyboard("[Escape]")).resolves.not.toThrow();
    await expect(user.click(cell("D"))).resolves.not.toThrow();

    cell("A").focus();
    await user.keyboard("[ArrowRight]");
    expect(cell("C")).toHaveFocus();
  });

  it("has no static accessibility violations with activation and dismissal wired up", async () => {
    const { container } = render(
      <AccessibleGrid
        label="Fixture grid"
        rows={rows}
        onActivate={() => {}}
        onDismiss={() => {}}
      />,
    );

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
