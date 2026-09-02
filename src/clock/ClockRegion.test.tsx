// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionIntent } from "../game/session";
import type { GameState } from "../rules/gameState";
import { ClockRegion } from "./ClockRegion";

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    ships: [],
    siteStates: {},
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: 30,
    outOfTime: { green: false, red: false },
    ...overrides,
  };
}

afterEach(cleanup);

describe("ClockRegion", () => {
  it("renders both readings, each under its side's name, green before red in DOM order", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ sideToMove: "green" });
    const { container } = render(
      <ClockRegion state={state} clockSetting={6} onIntent={onIntent} />,
    );

    const displays = container.querySelectorAll(".clock-display");
    expect(displays).toHaveLength(2);
    expect(displays[0].className).toContain("clock-display--green");
    expect(displays[1].className).toContain("clock-display--red");
    expect(displays[0].querySelector(".clock-display__name")?.textContent).toBe(
      "Green",
    );
    expect(displays[1].querySelector(".clock-display__name")?.textContent).toBe(
      "Red",
    );
    expect(
      displays[0].querySelector(".clock-display__reading")?.textContent,
    ).toBe("3:00");
    expect(
      displays[1].querySelector(".clock-display__reading")?.textContent,
    ).toBe("3:00");
  });

  it("marks the side to move as running, and the other as idle, swapping when the side to move does", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const greenToMove = buildState({ sideToMove: "green" });
    const { container, rerender } = render(
      <ClockRegion state={greenToMove} clockSetting={6} onIntent={onIntent} />,
    );

    const green = () => container.querySelector(".clock-display--green")!;
    const red = () => container.querySelector(".clock-display--red")!;

    expect(green().className).toContain("clock-display--running");
    expect(red().className).toContain("clock-display--idle");

    rerender(
      <ClockRegion
        state={buildState({ sideToMove: "red" })}
        clockSetting={6}
        onIntent={onIntent}
      />,
    );

    expect(red().className).toContain("clock-display--running");
    expect(green().className).toContain("clock-display--idle");
  });

  it("with no clock, both readings say INF and the side to move is still marked as running", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({ sideToMove: "green" });
    const { container } = render(
      <ClockRegion state={state} clockSetting="none" onIntent={onIntent} />,
    );

    const readings = container.querySelectorAll(".clock-display__reading");
    expect(readings).toHaveLength(2);
    for (const reading of readings) {
      expect(reading.textContent).toBe("INF");
    }
    expect(
      container.querySelector(".clock-display--green")?.className,
    ).toContain("clock-display--running");
    expect(container.querySelector(".clock-display--red")?.className).toContain(
      "clock-display--idle",
    );
  });

  it("a side at zero carries the flashing state", () => {
    vi.useFakeTimers();
    try {
      const onIntent = vi.fn<(intent: SessionIntent) => void>();
      const state = buildState({ sideToMove: "green", lengthInRounds: 30 });
      const { container } = render(
        <ClockRegion state={state} clockSetting={6} onIntent={onIntent} />,
      );

      act(() => {
        vi.advanceTimersByTime(180_000);
      });

      const green = container.querySelector(".clock-display--green")!;
      expect(green.querySelector(".clock-display__reading")?.textContent).toBe(
        "0.0",
      );
      expect(green.className).toContain("clock-display--zero");
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks neither side as running once the game is over", () => {
    const onIntent = vi.fn<(intent: SessionIntent) => void>();
    const state = buildState({
      sideToMove: "green",
      outOfTime: { green: true, red: true },
    });
    const { container } = render(
      <ClockRegion state={state} clockSetting={6} onIntent={onIntent} />,
    );

    expect(
      container.querySelector(".clock-display--green")?.className,
    ).toContain("clock-display--idle");
    expect(container.querySelector(".clock-display--red")?.className).toContain(
      "clock-display--idle",
    );
    expect(container.querySelector(".clock-display--running")).toBeNull();
  });
});
