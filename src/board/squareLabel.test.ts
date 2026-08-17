import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { squareLabel } from "./squareLabel";

describe("squareLabel", () => {
  it("names an ordinary empty square by its square name alone", () => {
    expect(squareLabel(squareAt("H", 8), false, undefined)).toBe("H8");
  });

  it("adds 'bay' for an empty bay", () => {
    expect(squareLabel(squareAt("D", 15), true, undefined)).toBe("D15, bay");
  });

  it("names an occupied bay for the green side, stating zero shields", () => {
    expect(
      squareLabel(squareAt("H", 15), true, { side: "green", shields: 0 }),
    ).toBe("H15, bay, green ship, 0 shields");
  });

  it("uses the singular at one shield", () => {
    expect(
      squareLabel(squareAt("L", 15), true, { side: "red", shields: 1 }),
    ).toBe("L15, bay, red ship, 1 shield");
  });

  it("uses the plural at a middle count", () => {
    expect(
      squareLabel(squareAt("D", 15), true, { side: "red", shields: 3 }),
    ).toBe("D15, bay, red ship, 3 shields");
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(
      squareLabel(squareAt("H", 8), false, { side: "green", shields: 4 }),
    ).toBe("H8, green ship, 4 shields");
  });
});
