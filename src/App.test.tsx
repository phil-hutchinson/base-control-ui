// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

// Vitest's globals are off (see vite.config.ts), so Testing Library's
// automatic afterEach cleanup never registers itself; without this, each
// test's render stays mounted and pollutes the next.
afterEach(cleanup);

describe("App", () => {
  it("renders the app shell heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Base Control" }),
    ).toBeInTheDocument();
  });

  it("shows the turn indicator", () => {
    render(<App />);

    expect(
      screen.getByText("Green's turn — 1 action left"),
    ).toBeInTheDocument();
  });

  it("shows the HUD's scores and round counter for the opening position", () => {
    render(<App />);

    expect(
      screen.getByText("Green: 0 energy, no nodes held."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Red: 0 energy, no nodes held."),
    ).toBeInTheDocument();
    expect(screen.getByText("1/100")).toBeInTheDocument();
  });

  it("has no result panel while the game is in progress", () => {
    render(<App />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: {
        // jsdom has no layout or canvas, so this rule cannot produce a
        // meaningful result here and instead prints a spurious
        // getContext-not-implemented error to stderr.
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
