// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_NAME } from "../gameName";
import {
  DEFAULT_FLEET_SIZE,
  FLEET_SIZES,
  type FleetSize,
} from "../rules/fleet";
import {
  DEFAULT_GAME_LENGTH_ROUNDS,
  GAME_LENGTH_OPTIONS_ROUNDS,
} from "../rules/gameLength";
import { StartScreen } from "./StartScreen";

afterEach(cleanup);

interface RenderOverrides {
  readonly fleetSize?: FleetSize;
  readonly lengthInRounds?: number;
  readonly onFleetSizeChange?: (fleetSize: FleetSize) => void;
  readonly onLengthInRoundsChange?: (lengthInRounds: number) => void;
  readonly onPlay?: () => void;
}

function renderStartScreen(overrides: RenderOverrides = {}) {
  const onFleetSizeChange = overrides.onFleetSizeChange ?? vi.fn();
  const onLengthInRoundsChange = overrides.onLengthInRoundsChange ?? vi.fn();
  const onPlay = overrides.onPlay ?? vi.fn();
  const { container } = render(
    <StartScreen
      fleetSize={overrides.fleetSize ?? DEFAULT_FLEET_SIZE}
      onFleetSizeChange={onFleetSizeChange}
      lengthInRounds={overrides.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS}
      onLengthInRoundsChange={onLengthInRoundsChange}
      onPlay={onPlay}
    />,
  );
  return { onFleetSizeChange, onLengthInRoundsChange, onPlay, container };
}

describe("StartScreen", () => {
  it("renders the game's name as the page's heading", () => {
    renderStartScreen();

    expect(
      screen.getByRole("heading", { level: 1, name: GAME_NAME }),
    ).toBeInTheDocument();
  });

  it("renders the ships group with its values and the selected one checked", () => {
    renderStartScreen({ fleetSize: 6 });

    const group = screen.getByRole("group", { name: "Ships" });
    for (const value of FLEET_SIZES) {
      const radio = within(group).getByRole("radio", {
        name: String(value),
      });
      expect(radio).toHaveAttribute("value", String(value));
      if (value === 6) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("renders the rounds group with its values and the selected one checked", () => {
    renderStartScreen({ lengthInRounds: 75 });

    const group = screen.getByRole("group", { name: "Rounds" });
    for (const value of GAME_LENGTH_OPTIONS_ROUNDS) {
      const radio = within(group).getByRole("radio", {
        name: String(value),
      });
      if (value === 75) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("calls the ships change handler, and not onPlay, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const { onFleetSizeChange, onLengthInRoundsChange, onPlay } =
      renderStartScreen({ fleetSize: 7 });

    await user.click(screen.getByRole("radio", { name: "5" }));

    expect(onFleetSizeChange).toHaveBeenCalledExactlyOnceWith(5);
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the rounds change handler, and not onPlay, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const { onFleetSizeChange, onLengthInRoundsChange, onPlay } =
      renderStartScreen({ lengthInRounds: 30 });

    await user.click(screen.getByRole("radio", { name: "50" }));

    expect(onLengthInRoundsChange).toHaveBeenCalledExactlyOnceWith(50);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls onPlay once when the PLAY button is pressed", async () => {
    const user = userEvent.setup();
    const { onPlay } = renderStartScreen();

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(onPlay).toHaveBeenCalledOnce();
  });

  it("flanks the column with a green and a red ship, both decorative and gaugeless", () => {
    const { container } = renderStartScreen();

    const green = container.querySelector(".ship-model--green");
    const red = container.querySelector(".ship-model--red");
    expect(green).toBeInTheDocument();
    expect(red).toBeInTheDocument();
    expect(green).toHaveAttribute("aria-hidden", "true");
    expect(red).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".ship-model")).toHaveLength(2);
    expect(container.querySelectorAll("[data-gauge-slot]")).toHaveLength(0);
  });
});
