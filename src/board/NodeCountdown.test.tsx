// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { NodeCountdown } from "./NodeCountdown";

afterEach(cleanup);

describe("NodeCountdown", () => {
  it("draws the given number as text", () => {
    const { container } = render(<NodeCountdown number={6} color="black" />);

    expect(container.querySelector("text")?.textContent).toBe("6");
  });

  it("draws black for a charged node and white for a trap", () => {
    const { container: blackContainer } = render(
      <NodeCountdown number={5} color="black" />,
    );
    const { container: whiteContainer } = render(
      <NodeCountdown number={5} color="white" />,
    );

    expect(blackContainer.querySelector("text")).toHaveAttribute(
      "fill",
      "black",
    );
    expect(whiteContainer.querySelector("text")).toHaveAttribute(
      "fill",
      "white",
    );
  });

  it("is hidden from the accessibility tree and carries no title or description", () => {
    const { container } = render(<NodeCountdown number={1} color="white" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  describe("burning out", () => {
    it("carries the burning-out class and travels from the given colour to its own", () => {
      const { container } = render(
        <NodeCountdown number={5} color="white" burnoutFrom="black" />,
      );

      const text = container.querySelector("text");
      expect(text).toHaveClass("node-countdown__number--burning-out");
      expect(text).not.toHaveAttribute("fill");
      expect(
        (text as unknown as HTMLElement).style.getPropertyValue("fill"),
      ).toBe("white");
      expect(
        (text as unknown as HTMLElement).style.getPropertyValue(
          "--node-countdown-burnout-from",
        ),
      ).toBe("black");
    });

    it("carries no burning-out class or style without burnoutFrom", () => {
      const { container } = render(<NodeCountdown number={5} color="white" />);

      const text = container.querySelector("text");
      expect(text).not.toHaveClass("node-countdown__number--burning-out");
      expect(text).toHaveAttribute("fill", "white");
    });
  });

  it("reports no axe violations", async () => {
    const { container } = render(<NodeCountdown number={3} color="black" />);

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
