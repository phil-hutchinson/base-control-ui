// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_NAME } from "../gameName";
import {
  type ClockSetting,
  CLOCK_SETTINGS,
  DEFAULT_CLOCK_SETTING,
} from "../rules/clock";
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

/** The Timer group's labels, mirroring `StartScreen`'s own map. */
const CLOCK_SETTING_LABELS: Record<ClockSetting, string> = {
  none: "None",
  6: "6s",
  4: "4s",
  2: "2s",
};

interface RenderOverrides {
  readonly fleetSize?: FleetSize;
  readonly lengthInRounds?: number;
  readonly clockSetting?: ClockSetting;
  readonly onFleetSizeChange?: (fleetSize: FleetSize) => void;
  readonly onLengthInRoundsChange?: (lengthInRounds: number) => void;
  readonly onClockSettingChange?: (clockSetting: ClockSetting) => void;
  readonly onPlay?: () => void;
}

function renderStartScreen(overrides: RenderOverrides = {}) {
  const onFleetSizeChange = overrides.onFleetSizeChange ?? vi.fn();
  const onLengthInRoundsChange = overrides.onLengthInRoundsChange ?? vi.fn();
  const onClockSettingChange = overrides.onClockSettingChange ?? vi.fn();
  const onPlay = overrides.onPlay ?? vi.fn();
  render(
    <StartScreen
      fleetSize={overrides.fleetSize ?? DEFAULT_FLEET_SIZE}
      onFleetSizeChange={onFleetSizeChange}
      lengthInRounds={overrides.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS}
      onLengthInRoundsChange={onLengthInRoundsChange}
      clockSetting={overrides.clockSetting ?? DEFAULT_CLOCK_SETTING}
      onClockSettingChange={onClockSettingChange}
      onPlay={onPlay}
    />,
  );
  return {
    onFleetSizeChange,
    onLengthInRoundsChange,
    onClockSettingChange,
    onPlay,
  };
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
    renderStartScreen({ lengthInRounds: 60 });

    const group = screen.getByRole("group", { name: "Rounds" });
    for (const value of GAME_LENGTH_OPTIONS_ROUNDS) {
      const radio = within(group).getByRole("radio", {
        name: String(value),
      });
      if (value === 60) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("renders the timer group with its labelled values and the selected one checked", () => {
    renderStartScreen({ clockSetting: 4 });

    const group = screen.getByRole("group", { name: "Timer" });
    for (const value of CLOCK_SETTINGS) {
      const radio = within(group).getByRole("radio", {
        name: CLOCK_SETTING_LABELS[value],
      });
      if (value === 4) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("calls the ships change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ fleetSize: 7 });

    await user.click(screen.getByRole("radio", { name: "5" }));

    expect(onFleetSizeChange).toHaveBeenCalledExactlyOnceWith(5);
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the rounds change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ lengthInRounds: 30 });

    await user.click(screen.getByRole("radio", { name: "45" }));

    expect(onLengthInRoundsChange).toHaveBeenCalledExactlyOnceWith(45);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the timer change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ clockSetting: "none" });

    await user.click(screen.getByRole("radio", { name: "6s" }));

    expect(onClockSettingChange).toHaveBeenCalledExactlyOnceWith(6);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls onPlay once when the PLAY button is pressed", async () => {
    const user = userEvent.setup();
    const { onPlay } = renderStartScreen();

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(onPlay).toHaveBeenCalledOnce();
  });
});
