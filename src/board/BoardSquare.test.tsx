// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("renders the spent mark and the faded-ship class when marked as already moved, and not otherwise", () => {
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
    expect(
      marked.querySelector(".board-square--already-moved"),
    ).toBeInTheDocument();

    expect(
      unmarked.querySelector(".board-square__mark--already-moved"),
    ).toBeNull();
    expect(unmarked.querySelector(".board-square--already-moved")).toBeNull();
  });
});
