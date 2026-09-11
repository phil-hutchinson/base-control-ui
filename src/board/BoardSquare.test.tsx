// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { ShipCondition } from "./squareLabel";
import { BoardSquare } from "./BoardSquare";
import { PLANET_ART } from "./planetArt";

const SAMPLE_PLANET = PLANET_ART[0];

afterEach(cleanup);

describe("BoardSquare", () => {
  it("renders neither a node marker nor a ship on a plain empty square", () => {
    const { container } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
    );

    expect(container.querySelector(".node-marker")).toBeNull();
    expect(container.querySelector(".ship-model")).toBeNull();
  });

  it("draws the planet modifier class only when the square is a planet", () => {
    const { container: planet } = render(
      <BoardSquare isPlanet={true} squareName="C7" />,
    );
    const { container: plain } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
    );

    expect(planet.querySelector(".board-square--planet")).toBeInTheDocument();
    expect(plain.querySelector(".board-square--planet")).toBeNull();
  });

  it("draws the node marker beneath the ship when a square holds both", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        nodeState="charged"
        occupant={{ side: "green", power: 2 }}
      />,
    );

    const square = container.querySelector(".board-square");
    expect(square).not.toBeNull();
    const children = Array.from(square?.children ?? []);
    const markerIndex = children.findIndex((child) =>
      child.classList.contains("node-marker"),
    );
    const shipIndex = children.findIndex((child) =>
      child.classList.contains("ship-model"),
    );

    expect(markerIndex).toBeGreaterThanOrEqual(0);
    expect(shipIndex).toBeGreaterThanOrEqual(0);
    expect(markerIndex).toBeLessThan(shipIndex);
  });

  it("draws the countdown number after the ship, in black on a charged node", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        nodeState="charged"
        countdownNumber={6}
        occupant={{ side: "green", power: 4 }}
      />,
    );

    const square = container.querySelector(".board-square");
    const children = Array.from(square?.children ?? []);
    const shipIndex = children.findIndex((child) =>
      child.classList.contains("ship-model"),
    );
    const countdownIndex = children.findIndex((child) =>
      child.classList.contains("node-countdown"),
    );

    expect(shipIndex).toBeGreaterThanOrEqual(0);
    expect(countdownIndex).toBeGreaterThan(shipIndex);
    expect(container.querySelector(".node-countdown")?.textContent).toBe("6");
    expect(container.querySelector(".node-countdown text")).toHaveAttribute(
      "fill",
      "black",
    );
  });

  it("draws the countdown number in white on a depleted node (a trap)", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        nodeState="depleted"
        countdownNumber={5}
        occupant={{ side: "green", power: 4 }}
      />,
    );

    expect(container.querySelector(".node-countdown text")).toHaveAttribute(
      "fill",
      "white",
    );
  });

  it("draws no countdown number when none is given", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        nodeState="charged"
        occupant={{ side: "green", power: 4 }}
      />,
    );

    expect(container.querySelector(".node-countdown")).toBeNull();
  });

  it("renders no planet when none is given, and renders one, aria-hidden, when it is", () => {
    const { container: bare } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
    );
    const { container: withPlanet } = render(
      <BoardSquare isPlanet={true} squareName="D15" planet={SAMPLE_PLANET} />,
    );

    expect(bare.querySelector(".planet")).toBeNull();
    const planet = withPlanet.querySelector(".planet");
    expect(planet).toBeInTheDocument();
    expect(planet).toHaveAttribute("aria-hidden", "true");
    expect(planet?.querySelector("use")?.getAttribute("href")).toBe(
      `#${SAMPLE_PLANET.ids.body}`,
    );
  });

  it("draws the planet beneath the ship, and keeps it whether or not the square is occupied", () => {
    const { container: empty } = render(
      <BoardSquare isPlanet={true} squareName="D15" planet={SAMPLE_PLANET} />,
    );
    const { container: occupied } = render(
      <BoardSquare
        isPlanet={true}
        squareName="D15"
        planet={SAMPLE_PLANET}
        occupant={{ side: "green", power: 2 }}
      />,
    );

    expect(empty.querySelector(".planet")).toBeInTheDocument();
    expect(occupied.querySelector(".planet")).toBeInTheDocument();

    const square = occupied.querySelector(".board-square");
    const children = Array.from(square?.children ?? []);
    const planetIndex = children.findIndex((child) =>
      child.classList.contains("planet"),
    );
    const shipIndex = children.findIndex((child) =>
      child.classList.contains("ship-model"),
    );
    expect(planetIndex).toBe(0);
    expect(planetIndex).toBeLessThan(shipIndex);
  });

  it("renders the destination mark when marked as a legal destination, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare isPlanet={false} squareName="H8" mark="destination" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
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
      <BoardSquare isPlanet={false} squareName="H8" mark="selected" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
    );

    expect(
      marked.querySelector(".board-square__mark--selected"),
    ).toBeInTheDocument();
    expect(unmarked.querySelector(".board-square__mark--selected")).toBeNull();
  });

  it("renders the target ring when marked as a legal attack target, and not otherwise", () => {
    const { container: marked } = render(
      <BoardSquare isPlanet={false} squareName="H8" mark="target" />,
    );
    const { container: unmarked } = render(
      <BoardSquare isPlanet={false} squareName="H8" />,
    );

    expect(
      marked.querySelector(".board-square__mark--target"),
    ).toBeInTheDocument();
    expect(unmarked.querySelector(".board-square__mark--target")).toBeNull();
  });

  it("draws the target ring hollow and distinct from the destination's solid disc", () => {
    const { container: target } = render(
      <BoardSquare isPlanet={false} squareName="H8" mark="target" />,
    );
    const { container: destination } = render(
      <BoardSquare isPlanet={false} squareName="H8" mark="destination" />,
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
      <BoardSquare isPlanet={false} squareName="H8" mark="target" />,
    );

    expect(container.querySelectorAll(".board-square__mark")).toHaveLength(1);
    expect(
      container.querySelector(".board-square__mark--destination"),
    ).toBeNull();
    expect(container.querySelector(".board-square__mark--selected")).toBeNull();
  });

  it("renders the hollow bar and the dampened class for cannot-move-or-attack", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        occupant={{ side: "green", power: 0 }}
        condition="cannot-move-or-attack"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--cannot-move-or-attack"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square--dampened"),
    ).toBeInTheDocument();

    const bar = container.querySelector(
      ".board-square__mark--cannot-move-or-attack rect",
    );
    expect(bar).toHaveAttribute("fill", "none");
  });

  it("renders a condition mark and a selection mark together", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        occupant={{ side: "green", power: 0 }}
        condition="cannot-move-or-attack"
        mark="selected"
      />,
    );

    expect(
      container.querySelector(".board-square__mark--cannot-move-or-attack"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".board-square__mark--selected"),
    ).toBeInTheDocument();
  });

  it("renders exactly what it rendered before condition existed, when no condition is given", () => {
    const { container } = render(
      <BoardSquare
        isPlanet={false}
        squareName="H8"
        nodeState="inactive"
        occupant={{ side: "red", power: 3 }}
        mark="destination"
      />,
    );

    expect(container.querySelector(".board-square--dampened")).toBeNull();
    expect(container.querySelectorAll(".board-square__mark")).toHaveLength(1);
    expect(
      container.querySelector(".board-square__mark--destination"),
    ).toBeInTheDocument();
  });

  it("reports no axe violations for any condition, and keeps every mark out of the accessibility tree", async () => {
    const conditions: readonly (ShipCondition | undefined)[] = [
      undefined,
      "cannot-move-or-attack",
    ];
    for (const condition of conditions) {
      const { container } = render(
        <BoardSquare
          isPlanet={false}
          squareName="H8"
          occupant={{ side: "green", power: 1 }}
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
