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

  it("names an occupied bay for the green side", () => {
    expect(squareLabel(squareAt("H", 15), true, "green")).toBe(
      "H15, bay, green ship",
    );
  });

  it("names an occupied bay for the red side", () => {
    expect(squareLabel(squareAt("D", 15), true, "red")).toBe(
      "D15, bay, red ship",
    );
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(squareLabel(squareAt("H", 8), false, "green")).toBe(
      "H8, green ship",
    );
  });
});
