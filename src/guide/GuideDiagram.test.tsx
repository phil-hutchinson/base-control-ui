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

  it("renders a quiet label with no square under it and no settlement glow", () => {
    const cells: readonly GuideDiagramCell[] = [
      { kind: "label", text: "SIMPLE" },
    ];
    const { container, getByText } = render(
      <GuideDiagram columns={1} cells={cells} />,
    );

    expect(getByText("SIMPLE")).toHaveClass("guide-diagram__label");
    expect(container.querySelector(".board-square")).toBeNull();
    expect(container.querySelector(".guide-diagram__note")).toBeNull();
  });

  it("does not force a label cell square, unlike every other cell kind", () => {
    const cells: readonly GuideDiagramCell[] = [
      { kind: "label", text: "BONUS" },
    ];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    expect(container.querySelector(".guide-diagram__cell")).toHaveClass(
      "guide-diagram__cell--label",
    );
  });

  it("sizes a label-column diagram's first column to its content, opt-in", () => {
    const cells: readonly GuideDiagramCell[] = [
      { kind: "label", text: "SIMPLE" },
      { kind: "label", text: "1" },
    ];
    const { container } = render(
      <GuideDiagram columns={2} cells={cells} labelColumn />,
    );

    expect(container.querySelector(".guide-diagram")).toHaveClass(
      "guide-diagram--label-column",
    );
  });

  it("renders an ordinary diagram with no label-column class when not opted in", () => {
    const cells: readonly GuideDiagramCell[] = [{ kind: "empty" }];
    const { container } = render(<GuideDiagram columns={1} cells={cells} />);

    expect(container.querySelector(".guide-diagram")).not.toHaveClass(
      "guide-diagram--label-column",
    );
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
