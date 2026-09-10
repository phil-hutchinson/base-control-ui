// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GuideDiagramCell } from "./GuideDiagram";
import { GuideDiagram } from "./GuideDiagram";

afterEach(cleanup);

describe("GuideDiagram", () => {
  it("renders a square cell, with its props reaching the square", () => {
    const cells: readonly GuideDiagramCell[] = [
      {
        kind: "square",
        square: {
          isPlanet: false,
          squareName: "guide-test-1",
          nodeState: "charged",
        },
      },
    ];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    expect(container.querySelector(".board-square")).toBeInTheDocument();
    expect(
      container.querySelector(".node-marker--charged"),
    ).toBeInTheDocument();
  });

  it("renders a cost number over no node countdown", () => {
    const cells: readonly GuideDiagramCell[] = [
      {
        kind: "number",
        square: { isPlanet: false, squareName: "guide-test-2" },
        value: 2,
      },
    ];
    const { container, getByText } = render(
      <GuideDiagram columns={1} cells={cells} />,
    );

    expect(getByText("2")).toHaveClass("guide-diagram__number");
    expect(container.querySelector(".node-countdown")).toBeNull();
  });

  it("renders a standalone note with no square under it", () => {
    const cells: readonly GuideDiagramCell[] = [{ kind: "note", text: "+3" }];
    const { container, getByText } = render(
      <GuideDiagram columns={1} cells={cells} />,
    );

    expect(getByText("+3")).toHaveClass("guide-diagram__note");
    expect(container.querySelector(".board-square")).toBeNull();
  });

  it("renders an arrow cell", () => {
    const cells: readonly GuideDiagramCell[] = [{ kind: "arrow" }];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    expect(
      container.querySelector(".guide-diagram__arrow"),
    ).toBeInTheDocument();
  });

  it("renders an empty cell with no square", () => {
    const cells: readonly GuideDiagramCell[] = [{ kind: "empty" }];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    const cell = container.querySelector(".guide-diagram__cell");
    expect(cell).toBeInTheDocument();
    expect(cell?.querySelector(".board-square")).toBeNull();
  });

  it("hides the whole diagram from the accessibility tree", () => {
    const cells: readonly GuideDiagramCell[] = [{ kind: "empty" }];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    expect(container.querySelector(".guide-diagram")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
