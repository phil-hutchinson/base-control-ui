// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FuelSymbol } from "./FuelSymbol";

afterEach(cleanup);

describe("FuelSymbol (steal.md §10)", () => {
  it("draws exactly one bar, not the ship's whole six-slot gauge", () => {
    const { container } = render(<FuelSymbol />);

    expect(container.querySelectorAll("[data-fuel-bar]")).toHaveLength(1);
    expect(container.querySelectorAll("line")).toHaveLength(2);
  });

  it("is hidden from the accessibility tree", () => {
    const { container } = render(<FuelSymbol />);

    expect(container.querySelector(".fuel-symbol")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
