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
    const { container } = render(<BoardSquare isBay={false} squareName="H8" />);

    expect(container.querySelector(".site-marker")).toBeNull();
    expect(container.querySelector(".ship-icon")).toBeNull();
  });

  it("draws the bay modifier class only when the square is a bay", () => {
    const { container: bay } = render(
      <BoardSquare isBay={true} squareName="C7" />,
    );
    const { container: plain } = render(
      <BoardSquare isBay={false} squareName="H8" />,
    );

    expect(bay.querySelector(".board-square--bay")).toBeInTheDocument();
    expect(plain.querySelector(".board-square--bay")).toBeNull();
  });

  it("draws the site marker beneath the ship when a square holds both", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
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
      <BoardSquare isBay={false} squareName="H8" mark="destination" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={false} squareName="H8" />,
    );

    expect(
      marked.querySelector(".board-square__mark--destination"),
    ).toBeInTheDocument();
    expect(
      unmarked.querySelector(".board-square__mark--destination"),
    ).toBeNull();
  });

  it("renders the selected mark when marked as selected, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare isBay={false} squareName="H8" mark="selected" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={false} squareName="H8" />,
    );

    expect(
      marked.querySelector(".board-square__mark--selected"),
    ).toBeInTheDocument();
    expect(unmarked.querySelector(".board-square__mark--selected")).toBeNull();
  });

  it("renders the target ring when marked as a legal attack target, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        mark={{ kind: "target", outcome: "attacker-won" }}
      />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={false} squareName="H8" />,
    );

    expect(
      marked.querySelector(".board-square__mark--target"),
    ).toBeInTheDocument();
    expect(unmarked.querySelector(".board-square__mark--target")).toBeNull();
  });

  it("draws the target ring hollow and distinct from the destination's solid disc", () => {
    const { container: target } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        mark={{ kind: "target", outcome: "attacker-won" }}
      />,
    );
    const { container: destination } = render(
      <BoardSquare isBay={false} squareName="H8" mark="destination" />,
    );

    const ring = target.querySelector(".board-square__mark--target circle");
    expect(ring).toHaveAttribute("fill", "none");
    const disc = destination.querySelector(
      ".board-square__mark--destination circle",
    );
    expect(disc).toHaveAttribute("fill", "currentColor");
    expect(Number(ring?.getAttribute("r"))).toBeGreaterThan(
      Number(disc?.getAttribute("r")),
    );
  });

  it("renders exactly one mark for the target square, never alongside destination or selected", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        mark={{ kind: "target", outcome: "attacker-won" }}
      />,
    );

    expect(container.querySelectorAll(".board-square__mark")).toHaveLength(1);
    expect(
      container.querySelector(".board-square__mark--destination"),
    ).toBeNull();
    expect(container.querySelector(".board-square__mark--selected")).toBeNull();
  });

  it("renders the already-acted bar from hasActed alone, without dampening the square", () => {
    const { container: marked } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
        hasActed={true}
      />,
    );
    const { container: unmarked } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
      />,
    );

    expect(
      marked.querySelector(".board-square__mark--already-acted"),
    ).toBeInTheDocument();
    expect(marked.querySelector(".board-square--dampened")).toBeNull();

    expect(
      unmarked.querySelector(".board-square__mark--already-acted"),
    ).toBeNull();
    expect(unmarked.querySelector(".board-square--dampened")).toBeNull();
  });

  it("renders the hollow bar and the dampened class for no-action, distinct from the solid already-acted bar", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
        condition="no-action"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--no-action"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square__mark--already-acted"),
    ).toBeNull();
    expect(
      container.querySelector(".board-square--dampened"),
    ).toBeInTheDocument();

    const bar = container.querySelector(".board-square__mark--no-action rect");
    expect(bar).toHaveAttribute("fill", "none");
  });

  it("renders both the already-acted bar and the no-action bar together, and dampens the square", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
        hasActed={true}
        condition="no-action"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--already-acted"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square__mark--no-action"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square--dampened"),
    ).toBeInTheDocument();
  });

  it("renders the chevron and does not apply the dampened class for owes-action, applying the owes-action class instead", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
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

  it("distinguishes the two condition marks from one another by shape, not only by class name", () => {
    const conditions: readonly ShipCondition[] = ["no-action", "owes-action"];
    const shapes = conditions.map((condition) => {
      const { container } = render(
        <BoardSquare
          isBay={false}
          squareName="H8"
          occupant={{ side: "green", shields: 0 }}
          condition={condition}
        />,
      );
      const mark = container.querySelector(".board-square__mark");
      return mark?.firstElementChild?.tagName;
    });

    // A hollow rect and a chevron path are two distinct element/attribute
    // shapes, so the layer survives greyscale.
    expect(shapes).toEqual(["rect", "path"]);
    const { container: noActionContainer } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
        condition="no-action"
      />,
    );
    const noActionBar = noActionContainer.querySelector(
      ".board-square__mark rect",
    );
    expect(noActionBar?.getAttribute("fill")).toBe("none");
  });

  it("distinguishes the already-acted bar from the no-action bar by fill, not only by class name", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
        occupant={{ side: "green", shields: 0 }}
        hasActed={true}
      />,
    );
    const alreadyMovedBar = container.querySelector(
      ".board-square__mark--already-acted rect",
    );
    expect(alreadyMovedBar?.getAttribute("fill")).toBe("currentColor");
  });

  it("renders a condition mark and a selection mark together", () => {
    const { container } = render(
      <BoardSquare
        isBay={false}
        squareName="H8"
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
        squareName="H8"
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

  it("renders four stroked corner lines for return position 1, and none with no return cue", () => {
    const { container: marked } = render(
      <BoardSquare isBay={true} squareName="C7" returnCue="return-position" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={true} squareName="C7" />,
    );

    const lines = marked.querySelectorAll(
      ".board-square__mark--return-position line",
    );
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line).toHaveAttribute("stroke", "currentColor");
    }
    expect(
      unmarked.querySelector(".board-square__mark--return-position"),
    ).toBeNull();
  });

  it("renders four filled corner triangles for the receptacle, and none with no return cue", () => {
    const { container: marked } = render(
      <BoardSquare isBay={true} squareName="C7" returnCue="receptacle" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isBay={true} squareName="C7" />,
    );

    const triangles = marked.querySelectorAll(
      ".board-square__mark--receptacle path",
    );
    expect(triangles).toHaveLength(4);
    for (const triangle of triangles) {
      expect(triangle).toHaveAttribute("fill", "currentColor");
    }
    expect(
      unmarked.querySelector(".board-square__mark--receptacle"),
    ).toBeNull();
  });

  it("draws only the solid receptacle triangles when a bay is both position 1 and the receptacle", () => {
    const { container } = render(
      <BoardSquare
        isBay={true}
        squareName="C7"
        returnCue="return-position-and-receptacle"
      />,
    );

    expect(
      container.querySelectorAll(".board-square__mark--receptacle path"),
    ).toHaveLength(4);
    expect(
      container.querySelector(".board-square__mark--return-position"),
    ).toBeNull();
  });

  it("reports no axe violations for any condition or having-moved combination, and keeps every mark out of the accessibility tree", async () => {
    const conditions: readonly (ShipCondition | undefined)[] = [
      undefined,
      "no-action",
      "owes-action",
    ];
    const hasActedValues: readonly boolean[] = [false, true];
    for (const condition of conditions) {
      for (const hasActed of hasActedValues) {
        const { container } = render(
          <BoardSquare
            isBay={false}
            squareName="H8"
            occupant={{ side: "green", shields: 1 }}
            hasActed={hasActed}
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
    }
  });
});
