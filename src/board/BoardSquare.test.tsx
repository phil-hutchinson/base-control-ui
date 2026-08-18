// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { ShipCondition } from "./squareLabel";
import { BoardSquare } from "./BoardSquare";

afterEach(cleanup);

describe("BoardSquare", () => {
  it("renders neither a site marker nor a ship on a plain empty square", () => {
    const { container } = render(<BoardSquare isBay={false} />);

    expect(container.querySelector(".site-marker")).toBeNull();
    expect(container.querySelector(".ship-icon")).toBeNull();
  });

  it("draws the bay modifier class only when the square is a bay", () => {
    const { container: bay } = render(<BoardSquare isBay={true} />);
    const { container: plain } = render(<BoardSquare isBay={false} />);

    expect(bay.querySelector(".board-square--bay")).toBeInTheDocument();
    expect(plain.querySelector(".board-square--bay")).toBeNull();
  });

  it("draws the site marker beneath the ship when a square holds both", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        siteState="charged"
        occupant={{ side: "green", shields: 2 }}
      />,
    );

    const square = container.querySelector(".board-square");
    expect(square).not.toBeNull();
    const children = Array.from(square?.children ?? []);
    const markerIndex = children.findIndex((child) =>
      child.classList.contains("site-marker"),
    );
    const shipIndex = children.findIndex((child) =>
      child.classList.contains("ship-icon"),
    );

    expect(markerIndex).toBeGreaterThanOrEqual(0);
    expect(shipIndex).toBeGreaterThanOrEqual(0);
    expect(markerIndex).toBeLessThan(shipIndex);
  });

  it("renders the destination mark when marked as a legal destination, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare isBay={false} mark="destination" />,
    );
    const { container: unmarked } = render(<BoardSquare isBay={false} />);

    expect(
      marked.querySelector(".board-square__mark--destination"),
    ).toBeInTheDocument();
    expect(
      unmarked.querySelector(".board-square__mark--destination"),
    ).toBeNull();
  });

  it("renders the selected mark when marked as selected, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare isBay={false} mark="selected" />,
    );
    const { container: unmarked } = render(<BoardSquare isBay={false} />);

    expect(
      marked.querySelector(".board-square__mark--selected"),
    ).toBeInTheDocument();
    expect(unmarked.querySelector(".board-square__mark--selected")).toBeNull();
  });

  it("renders the already-moved bar and the dampened class when marked as already moved, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare
        isBay={false}
        occupant={{ side: "green", shields: 0 }}
        condition="already-moved"
      />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={false} occupant={{ side: "green", shields: 0 }} />,
    );

    expect(
      marked.querySelector(".board-square__mark--already-moved"),
    ).toBeInTheDocument();
    expect(marked.querySelector(".board-square--dampened")).toBeInTheDocument();

    expect(
      unmarked.querySelector(".board-square__mark--already-moved"),
    ).toBeNull();
    expect(unmarked.querySelector(".board-square--dampened")).toBeNull();
  });

  it("renders the hollow bar and the dampened class for no-action, distinct from the solid already-moved bar", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        occupant={{ side: "green", shields: 0 }}
        condition="no-action"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--no-action"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square__mark--already-moved"),
    ).toBeNull();
    expect(
      container.querySelector(".board-square--dampened"),
    ).toBeInTheDocument();

    const bar = container.querySelector(".board-square__mark--no-action rect");
    expect(bar).toHaveAttribute("fill", "none");
  });

  it("renders the chevron and does not apply the dampened class for owes-action, applying the owes-action class instead", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        occupant={{ side: "green", shields: 0 }}
        condition="owes-action"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--owes-action"),
    ).toBeInTheDocument();
    expect(container.querySelector(".board-square--dampened")).toBeNull();
    expect(
      container.querySelector(".board-square--owes-action"),
    ).toBeInTheDocument();
  });

  it("distinguishes the three condition marks from one another by shape, not only by class name", () => {
    const conditions: readonly ShipCondition[] = [
      "already-moved",
      "no-action",
      "owes-action",
    ];
    const shapes = conditions.map((condition) => {
      const { container } = render(
        <BoardSquare
          isBay={false}
          occupant={{ side: "green", shields: 0 }}
          condition={condition}
        />,
      );
      const mark = container.querySelector(".board-square__mark");
      return mark?.firstElementChild?.tagName;
    });

    // A solid rect, a hollow rect and a chevron path are three distinct
    // element/attribute shapes, so the layer survives greyscale.
    expect(shapes).toEqual(["rect", "rect", "path"]);
    const [already, noAction] = conditions.map((condition) => {
      const { container } = render(
        <BoardSquare
          isBay={false}
          occupant={{ side: "green", shields: 0 }}
          condition={condition}
        />,
      );
      return container.querySelector(".board-square__mark rect");
    });
    expect(already?.getAttribute("fill")).toBe("currentColor");
    expect(noAction?.getAttribute("fill")).toBe("none");
  });

  it("renders a condition mark and a selection mark together", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        occupant={{ side: "green", shields: 0 }}
        condition="owes-action"
        mark="selected"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--owes-action"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square__mark--selected"),
    ).toBeInTheDocument();
  });

  it("renders exactly what it rendered before condition existed, when no condition is given", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        siteState="active"
        occupant={{ side: "red", shields: 3 }}
        mark="destination"
      />,
    );

    expect(container.querySelector(".board-square--dampened")).toBeNull();
    expect(container.querySelector(".board-square--owes-action")).toBeNull();
    expect(container.querySelectorAll(".board-square__mark")).toHaveLength(1);
    expect(
      container.querySelector(".board-square__mark--destination"),
    ).toBeInTheDocument();
  });

  it("reports no axe violations for any condition, and keeps every mark out of the accessibility tree", async () => {
    const conditions: readonly (ShipCondition | undefined)[] = [
      undefined,
      "already-moved",
      "no-action",
      "owes-action",
    ];
    for (const condition of conditions) {
      const { container } = render(
        <BoardSquare
          isBay={false}
          occupant={{ side: "green", shields: 1 }}
          condition={condition}
          mark="selected"
        />,
      );

      for (const mark of container.querySelectorAll(".board-square__mark")) {
        expect(mark).toHaveAttribute("aria-hidden", "true");
      }

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
      cleanup();
    }
  });
});
