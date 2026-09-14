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
  COMBAT_SETTINGS,
  DEFAULT_COMBAT_ENABLED,
} from "../rules/combatSetting";
import {
  DEFAULT_FLEET_SIZE,
  FLEET_SIZES,
  type FleetSize,
} from "../rules/fleet";
import {
  DEFAULT_GAME_LENGTH_ROUNDS,
  GAME_LENGTH_OPTIONS_ROUNDS,
} from "../rules/gameLength";
import {
  CHARGED_NODE_COUNTS,
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
} from "../rules/nodes";
import {
  DEFAULT_SCORING,
  SCORING_SETTINGS,
  type ScoringSetting,
} from "../rules/scoring";
import { StartScreen } from "./StartScreen";

afterEach(cleanup);

/** The Clock group's labels, mirroring `StartScreen`'s own map. */
const CLOCK_SETTING_LABELS: Record<ClockSetting, string> = {
  none: "UNLIMITED",
  6: "6s",
  4: "4s",
  2: "2s",
};

/** The Combat group's labels, mirroring `StartScreen`'s own map. */
const COMBAT_SETTING_LABELS: Record<"off" | "on", string> = {
  off: "OFF",
  on: "ON",
};

/** The Scoring group's labels, mirroring `StartScreen`'s own map. */
const SCORING_SETTING_LABELS: Record<ScoringSetting, string> = {
  simple: "SIMPLE",
  bonus: "BONUS",
};

interface RenderOverrides {
  readonly fleetSize?: FleetSize;
  readonly chargedNodeCount?: ChargedNodeCount;
  readonly combatEnabled?: boolean;
  readonly scoring?: ScoringSetting;
  readonly lengthInRounds?: number;
  readonly clockSetting?: ClockSetting;
  readonly onFleetSizeChange?: (fleetSize: FleetSize) => void;
  readonly onChargedNodeCountChange?: (
    chargedNodeCount: ChargedNodeCount,
  ) => void;
  readonly onCombatEnabledChange?: (combatEnabled: boolean) => void;
  readonly onScoringChange?: (scoring: ScoringSetting) => void;
  readonly onLengthInRoundsChange?: (lengthInRounds: number) => void;
  readonly onClockSettingChange?: (clockSetting: ClockSetting) => void;
  readonly onPlay?: () => void;
  readonly onOpenGuide?: () => void;
}

function renderStartScreen(overrides: RenderOverrides = {}) {
  const onFleetSizeChange = overrides.onFleetSizeChange ?? vi.fn();
  const onChargedNodeCountChange =
    overrides.onChargedNodeCountChange ?? vi.fn();
  const onCombatEnabledChange = overrides.onCombatEnabledChange ?? vi.fn();
  const onScoringChange = overrides.onScoringChange ?? vi.fn();
  const onLengthInRoundsChange = overrides.onLengthInRoundsChange ?? vi.fn();
  const onClockSettingChange = overrides.onClockSettingChange ?? vi.fn();
  const onPlay = overrides.onPlay ?? vi.fn();
  const onOpenGuide = overrides.onOpenGuide ?? vi.fn();
  render(
    <StartScreen
      fleetSize={overrides.fleetSize ?? DEFAULT_FLEET_SIZE}
      onFleetSizeChange={onFleetSizeChange}
      chargedNodeCount={
        overrides.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT
      }
      onChargedNodeCountChange={onChargedNodeCountChange}
      combatEnabled={overrides.combatEnabled ?? DEFAULT_COMBAT_ENABLED}
      onCombatEnabledChange={onCombatEnabledChange}
      scoring={overrides.scoring ?? DEFAULT_SCORING}
      onScoringChange={onScoringChange}
      lengthInRounds={overrides.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS}
      onLengthInRoundsChange={onLengthInRoundsChange}
      clockSetting={overrides.clockSetting ?? DEFAULT_CLOCK_SETTING}
      onClockSettingChange={onClockSettingChange}
      onPlay={onPlay}
      onOpenGuide={onOpenGuide}
    />,
  );
  return {
    onFleetSizeChange,
    onChargedNodeCountChange,
    onCombatEnabledChange,
    onScoringChange,
    onLengthInRoundsChange,
    onClockSettingChange,
    onPlay,
    onOpenGuide,
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

  it("renders the charged nodes group with its values and the selected one checked", () => {
    renderStartScreen({ chargedNodeCount: 4 });

    const group = screen.getByRole("group", { name: "Charged nodes" });
    for (const value of CHARGED_NODE_COUNTS) {
      const radio = within(group).getByRole("radio", {
        name: String(value),
      });
      expect(radio).toHaveAttribute("value", String(value));
      if (value === 4) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("renders the charged nodes group with 5 checked by default", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Charged nodes" });
    expect(within(group).getByRole("radio", { name: "5" })).toBeChecked();
  });

  it("renders the charged nodes group's values in order, largest first", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Charged nodes" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["5", "4", "3"]);
  });

  it("renders the six option groups in order: Ships, Charged nodes, Scoring, Combat, Rounds, Clock", () => {
    renderStartScreen();

    const groups = screen.getAllByRole("group");
    expect(
      groups.map((group) => group.querySelector("legend")?.textContent ?? ""),
    ).toEqual([
      "Ships",
      "Charged nodes",
      "Scoring",
      "Combat",
      "Rounds",
      "Clock (time per move)",
    ]);
  });

  it("renders the scoring group with both labels and the given one checked", () => {
    renderStartScreen({ scoring: "bonus" });

    const group = screen.getByRole("group", { name: "Scoring" });
    for (const value of SCORING_SETTINGS) {
      const radio = within(group).getByRole("radio", {
        name: SCORING_SETTING_LABELS[value],
      });
      if (value === "bonus") {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("checks SIMPLE by default, with the radios in order SIMPLE then BONUS", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Scoring" });
    expect(within(group).getByRole("radio", { name: "SIMPLE" })).toBeChecked();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["simple", "bonus"]);
  });

  it("calls the scoring change handler with bonus when BONUS is chosen, and not the others", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onScoringChange,
      onCombatEnabledChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ scoring: "simple" });

    const group = screen.getByRole("group", { name: "Scoring" });
    await user.click(within(group).getByRole("radio", { name: "BONUS" }));

    expect(onScoringChange).toHaveBeenCalledExactlyOnceWith("bonus");
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onCombatEnabledChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the scoring change handler with simple when SIMPLE is chosen from a bonus state", async () => {
    const user = userEvent.setup();
    const { onScoringChange } = renderStartScreen({ scoring: "bonus" });

    const group = screen.getByRole("group", { name: "Scoring" });
    await user.click(within(group).getByRole("radio", { name: "SIMPLE" }));

    expect(onScoringChange).toHaveBeenCalledExactlyOnceWith("simple");
  });

  it("renders the combat group with both labels and the given one checked", () => {
    renderStartScreen({ combatEnabled: true });

    const group = screen.getByRole("group", { name: "Combat" });
    for (const value of COMBAT_SETTINGS) {
      const radio = within(group).getByRole("radio", {
        name: COMBAT_SETTING_LABELS[value ? "on" : "off"],
      });
      if (value) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("checks OFF by default, with the radios in order OFF then ON", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Combat" });
    expect(within(group).getByRole("radio", { name: "OFF" })).toBeChecked();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["off", "on"]);
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

  it("renders the clock group with its labelled values and the selected one checked", () => {
    renderStartScreen({ clockSetting: 4 });

    const group = screen.getByRole("group", {
      name: "Clock (time per move)",
    });
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
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ fleetSize: 6 });

    const group = screen.getByRole("group", { name: "Ships" });
    await user.click(within(group).getByRole("radio", { name: "5" }));

    expect(onFleetSizeChange).toHaveBeenCalledExactlyOnceWith(5);
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the charged nodes change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ chargedNodeCount: 5 });

    const group = screen.getByRole("group", { name: "Charged nodes" });
    await user.click(within(group).getByRole("radio", { name: "4" }));

    expect(onChargedNodeCountChange).toHaveBeenCalledExactlyOnceWith(4);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the charged nodes change handler with 3, and not the others, when 3 charged nodes are chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ chargedNodeCount: 5 });

    const group = screen.getByRole("group", { name: "Charged nodes" });
    await user.click(within(group).getByRole("radio", { name: "3" }));

    expect(onChargedNodeCountChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the ships change handler, and not the others, when 3 is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ fleetSize: 6 });

    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    await user.click(within(shipsGroup).getByRole("radio", { name: "3" }));

    expect(onFleetSizeChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the combat change handler with true when ON is chosen, and not the others", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onCombatEnabledChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ combatEnabled: false });

    const group = screen.getByRole("group", { name: "Combat" });
    await user.click(within(group).getByRole("radio", { name: "ON" }));

    expect(onCombatEnabledChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the combat change handler with false when OFF is chosen from an ON state", async () => {
    const user = userEvent.setup();
    const { onCombatEnabledChange } = renderStartScreen({
      combatEnabled: true,
    });

    const group = screen.getByRole("group", { name: "Combat" });
    await user.click(within(group).getByRole("radio", { name: "OFF" }));

    expect(onCombatEnabledChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("calls the rounds change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ lengthInRounds: 30 });

    await user.click(screen.getByRole("radio", { name: "45" }));

    expect(onLengthInRoundsChange).toHaveBeenCalledExactlyOnceWith(45);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the clock change handler, and not the others, when a different value is chosen", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ clockSetting: "none" });

    await user.click(screen.getByRole("radio", { name: "6s" }));

    expect(onClockSettingChange).toHaveBeenCalledExactlyOnceWith(6);
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls onPlay once when the PLAY button is pressed", async () => {
    const user = userEvent.setup();
    const { onPlay } = renderStartScreen();

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(onPlay).toHaveBeenCalledOnce();
  });

  it("renders a Quick Guide button before the Ships group, calling onOpenGuide and changing none of the three options", async () => {
    const user = userEvent.setup();
    const {
      onOpenGuide,
      onFleetSizeChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen();

    const guideButton = screen.getByRole("button", { name: "Quick Guide" });
    const shipsGroup = screen.getByRole("group", { name: "Ships" });
    expect(
      guideButton.compareDocumentPosition(shipsGroup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(guideButton);

    expect(onOpenGuide).toHaveBeenCalledOnce();
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });
});
