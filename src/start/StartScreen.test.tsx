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
  DEFAULT_NODE_PLAYSTYLE,
  NODE_PLAYSTYLES,
  type NodePlaystyle,
} from "../rules/nodePlaystyle";
import {
  CHARGED_NODE_COUNTS,
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
} from "../rules/nodes";
import {
  DEFAULT_PLANET_ACTIVITY,
  PLANET_ACTIVITY_SETTINGS,
  type PlanetActivitySetting,
} from "../rules/planetActivity";
import {
  DEFAULT_PLANET_BONUS,
  PLANET_BONUS_SETTINGS,
  type PlanetBonusSetting,
} from "../rules/planetBonus";
import {
  DEFAULT_PLAYER_MATCHING,
  PLAYER_MATCHING_SETTINGS,
  type PlayerMatchingSetting,
} from "../rules/playerMatching";
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

/** The Node playstyle group's labels, mirroring `StartScreen`'s own map. */
const NODE_PLAYSTYLE_LABELS: Record<NodePlaystyle, string> = {
  continuous: "CONTINUOUS",
  planet: "PLANET",
  dedicated: "DEDICATED",
  steal: "STEAL",
};

/** The Planet bonus group's labels, mirroring `StartScreen`'s own map. */
const PLANET_BONUS_SETTING_LABELS: Record<PlanetBonusSetting, string> = {
  off: "OFF",
  two: "2 POINTS",
  three: "3 POINTS",
};

/** The Planet activity group's labels, mirroring `StartScreen`'s own map. */
const PLANET_ACTIVITY_SETTING_LABELS: Record<PlanetActivitySetting, string> = {
  off: "OFF",
  race: "RACE",
};

/** The Player-matching nodes group's labels, mirroring `StartScreen`'s own map. */
const PLAYER_MATCHING_LABELS: Record<PlayerMatchingSetting, string> = {
  off: "OFF",
  double: "DOUBLE",
  required: "REQUIRED",
};

interface RenderOverrides {
  readonly fleetSize?: FleetSize;
  readonly chargedNodeCount?: ChargedNodeCount;
  readonly combatEnabled?: boolean;
  readonly scoring?: ScoringSetting;
  readonly planetBonus?: PlanetBonusSetting;
  readonly planetActivity?: PlanetActivitySetting;
  readonly nodePlaystyle?: NodePlaystyle;
  readonly playerMatching?: PlayerMatchingSetting;
  readonly lengthInRounds?: number;
  readonly clockSetting?: ClockSetting;
  readonly onFleetSizeChange?: (fleetSize: FleetSize) => void;
  readonly onChargedNodeCountChange?: (
    chargedNodeCount: ChargedNodeCount,
  ) => void;
  readonly onCombatEnabledChange?: (combatEnabled: boolean) => void;
  readonly onScoringChange?: (scoring: ScoringSetting) => void;
  readonly onPlanetBonusChange?: (planetBonus: PlanetBonusSetting) => void;
  readonly onPlanetActivityChange?: (
    planetActivity: PlanetActivitySetting,
  ) => void;
  readonly onNodePlaystyleChange?: (nodePlaystyle: NodePlaystyle) => void;
  readonly onPlayerMatchingChange?: (
    playerMatching: PlayerMatchingSetting,
  ) => void;
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
  const onPlanetBonusChange = overrides.onPlanetBonusChange ?? vi.fn();
  const onPlanetActivityChange = overrides.onPlanetActivityChange ?? vi.fn();
  const onNodePlaystyleChange = overrides.onNodePlaystyleChange ?? vi.fn();
  const onPlayerMatchingChange = overrides.onPlayerMatchingChange ?? vi.fn();
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
      planetBonus={overrides.planetBonus ?? DEFAULT_PLANET_BONUS}
      onPlanetBonusChange={onPlanetBonusChange}
      planetActivity={overrides.planetActivity ?? DEFAULT_PLANET_ACTIVITY}
      onPlanetActivityChange={onPlanetActivityChange}
      nodePlaystyle={overrides.nodePlaystyle ?? DEFAULT_NODE_PLAYSTYLE}
      onNodePlaystyleChange={onNodePlaystyleChange}
      playerMatching={overrides.playerMatching ?? DEFAULT_PLAYER_MATCHING}
      onPlayerMatchingChange={onPlayerMatchingChange}
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
    onPlanetBonusChange,
    onPlanetActivityChange,
    onNodePlaystyleChange,
    onPlayerMatchingChange,
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
    renderStartScreen({ fleetSize: 4 });

    const group = screen.getByRole("group", { name: "Ships" });
    for (const value of FLEET_SIZES) {
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

  it("offers exactly 5, 4 and 3 ships, with 5 preselected", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Ships" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["5", "4", "3"]);
    expect(within(group).getByRole("radio", { name: "5" })).toBeChecked();
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

  it("renders the charged nodes group with 4 checked by default", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Charged nodes" });
    expect(within(group).getByRole("radio", { name: "4" })).toBeChecked();
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

  it("renders the eight option groups in order: Node playstyle, Ships, Charged nodes, Scoring, Planet bonus, Combat, Rounds, Clock, with no Player-matching nodes group, under a non-steal playstyle", () => {
    renderStartScreen({ nodePlaystyle: "planet" });

    const groups = screen.getAllByRole("group");
    expect(
      groups.map((group) => group.querySelector("legend")?.textContent ?? ""),
    ).toEqual([
      "Node playstyle",
      "Ships",
      "Charged nodes",
      "Scoring",
      "Planet bonus",
      "Combat",
      "Rounds",
      "Clock (time per move)",
    ]);
  });

  it("renders nine option groups under STEAL, with Player-matching nodes between Charged nodes and Scoring, and Planet activity in Planet bonus's place", () => {
    renderStartScreen({ nodePlaystyle: "steal" });

    const groups = screen.getAllByRole("group");
    expect(
      groups.map((group) => group.querySelector("legend")?.textContent ?? ""),
    ).toEqual([
      "Node playstyle",
      "Ships",
      "Charged nodes",
      "Player-matching nodes",
      "Scoring",
      "Planet activity",
      "Combat",
      "Rounds",
      "Clock (time per move)",
    ]);
  });

  it("renders the player-matching nodes group only under STEAL, and not under the other three playstyles", () => {
    for (const nodePlaystyle of [
      "continuous",
      "planet",
      "dedicated",
    ] as const) {
      renderStartScreen({ nodePlaystyle });

      expect(
        screen.queryByRole("group", { name: "Player-matching nodes" }),
      ).not.toBeInTheDocument();

      cleanup();
    }
  });

  it("renders the player-matching nodes group under STEAL, offering OFF, DOUBLE, REQUIRED in order with the given one checked", () => {
    renderStartScreen({ nodePlaystyle: "steal", playerMatching: "double" });

    const group = screen.getByRole("group", { name: "Player-matching nodes" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(PLAYER_MATCHING_SETTINGS);
    for (const value of PLAYER_MATCHING_SETTINGS) {
      const radio = within(group).getByRole("radio", {
        name: PLAYER_MATCHING_LABELS[value],
      });
      if (value === "double") {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("checks OFF by default in the player-matching nodes group under STEAL", () => {
    renderStartScreen({ nodePlaystyle: "steal" });

    const group = screen.getByRole("group", { name: "Player-matching nodes" });
    expect(within(group).getByRole("radio", { name: "OFF" })).toBeChecked();
  });

  it("calls the player-matching change handler with double when DOUBLE is chosen, and not the others", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onScoringChange,
      onPlanetBonusChange,
      onNodePlaystyleChange,
      onCombatEnabledChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
      onPlayerMatchingChange,
    } = renderStartScreen({ nodePlaystyle: "steal", playerMatching: "off" });

    const group = screen.getByRole("group", { name: "Player-matching nodes" });
    await user.click(within(group).getByRole("radio", { name: "DOUBLE" }));

    expect(onPlayerMatchingChange).toHaveBeenCalledExactlyOnceWith("double");
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onScoringChange).not.toHaveBeenCalled();
    expect(onPlanetBonusChange).not.toHaveBeenCalled();
    expect(onNodePlaystyleChange).not.toHaveBeenCalled();
    expect(onCombatEnabledChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
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

  it("checks BONUS by default, with the radios in order SIMPLE then BONUS", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Scoring" });
    expect(within(group).getByRole("radio", { name: "BONUS" })).toBeChecked();
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

  it("renders the planet bonus group with the three classic labels and the given one checked, under a non-steal playstyle", () => {
    renderStartScreen({ nodePlaystyle: "planet", planetBonus: "three" });

    const group = screen.getByRole("group", { name: "Planet bonus" });
    for (const value of PLANET_BONUS_SETTINGS) {
      const radio = within(group).getByRole("radio", {
        name: PLANET_BONUS_SETTING_LABELS[value],
      });
      if (value === "three") {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("checks OFF by default, with the planet bonus radios in order OFF, 2 POINTS, 3 POINTS", () => {
    renderStartScreen();

    const group = screen.getByRole("group", { name: "Planet bonus" });
    expect(within(group).getByRole("radio", { name: "OFF" })).toBeChecked();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["off", "two", "three"]);
  });

  it("renders the planet bonus group, offering OFF, 2 POINTS, 3 POINTS in order, and no planet activity group, under each non-steal playstyle", () => {
    for (const nodePlaystyle of [
      "continuous",
      "planet",
      "dedicated",
    ] as const) {
      renderStartScreen({ nodePlaystyle });

      const group = screen.getByRole("group", { name: "Planet bonus" });
      expect(
        within(group)
          .getAllByRole("radio")
          .map((radio) => radio.getAttribute("value")),
      ).toEqual(PLANET_BONUS_SETTINGS);
      expect(
        within(group)
          .getAllByRole("radio")
          .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent),
      ).toEqual(["OFF", "2 POINTS", "3 POINTS"]);
      expect(
        screen.queryByRole("group", { name: "Planet activity" }),
      ).not.toBeInTheDocument();

      cleanup();
    }
  });

  it("renders the planet activity group under STEAL, offering OFF, RACE in order, and no planet bonus group", () => {
    renderStartScreen({ nodePlaystyle: "steal" });

    const group = screen.getByRole("group", { name: "Planet activity" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(PLANET_ACTIVITY_SETTINGS);
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent),
    ).toEqual(
      PLANET_ACTIVITY_SETTINGS.map(
        (value) => PLANET_ACTIVITY_SETTING_LABELS[value],
      ),
    );
    expect(
      screen.queryByRole("group", { name: "Planet bonus" }),
    ).not.toBeInTheDocument();
  });

  it("checks RACE when chosen under STEAL", () => {
    renderStartScreen({ nodePlaystyle: "steal", planetActivity: "race" });

    const group = screen.getByRole("group", { name: "Planet activity" });
    expect(within(group).getByRole("radio", { name: "RACE" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "OFF" })).not.toBeChecked();
  });

  it("calls the planet activity change handler with race when RACE is chosen, and not the planet bonus handler", async () => {
    const user = userEvent.setup();
    const { onPlanetActivityChange, onPlanetBonusChange, onPlay } =
      renderStartScreen({ nodePlaystyle: "steal", planetActivity: "off" });

    const group = screen.getByRole("group", { name: "Planet activity" });
    await user.click(within(group).getByRole("radio", { name: "RACE" }));

    expect(onPlanetActivityChange).toHaveBeenCalledExactlyOnceWith("race");
    expect(onPlanetBonusChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls the planet bonus change handler with three when 3 POINTS is chosen, and not the others", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onScoringChange,
      onPlanetBonusChange,
      onCombatEnabledChange,
      onNodePlaystyleChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ planetBonus: "off" });

    const group = screen.getByRole("group", { name: "Planet bonus" });
    await user.click(within(group).getByRole("radio", { name: "3 POINTS" }));

    expect(onPlanetBonusChange).toHaveBeenCalledExactlyOnceWith("three");
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onScoringChange).not.toHaveBeenCalled();
    expect(onNodePlaystyleChange).not.toHaveBeenCalled();
    expect(onCombatEnabledChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("renders the node playstyle group with all four labels and the given one checked", () => {
    renderStartScreen({ nodePlaystyle: "dedicated" });

    const group = screen.getByRole("group", {
      name: "Node playstyle",
    });
    for (const value of NODE_PLAYSTYLES) {
      const radio = within(group).getByRole("radio", {
        name: NODE_PLAYSTYLE_LABELS[value],
      });
      if (value === "dedicated") {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("checks PLANET by default, with the radios in order CONTINUOUS, PLANET, DEDICATED, STEAL", () => {
    renderStartScreen();

    const group = screen.getByRole("group", {
      name: "Node playstyle",
    });
    expect(within(group).getByRole("radio", { name: "PLANET" })).toBeChecked();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["continuous", "planet", "dedicated", "steal"]);
  });

  it("calls the node playstyle change handler with dedicated when DEDICATED is chosen, and not the others", async () => {
    const user = userEvent.setup();
    const {
      onFleetSizeChange,
      onChargedNodeCountChange,
      onScoringChange,
      onCombatEnabledChange,
      onNodePlaystyleChange,
      onLengthInRoundsChange,
      onClockSettingChange,
      onPlay,
    } = renderStartScreen({ nodePlaystyle: "continuous" });

    const group = screen.getByRole("group", {
      name: "Node playstyle",
    });
    await user.click(within(group).getByRole("radio", { name: "DEDICATED" }));

    expect(onNodePlaystyleChange).toHaveBeenCalledExactlyOnceWith("dedicated");
    expect(onFleetSizeChange).not.toHaveBeenCalled();
    expect(onChargedNodeCountChange).not.toHaveBeenCalled();
    expect(onScoringChange).not.toHaveBeenCalled();
    expect(onCombatEnabledChange).not.toHaveBeenCalled();
    expect(onLengthInRoundsChange).not.toHaveBeenCalled();
    expect(onClockSettingChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
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
    } = renderStartScreen({ fleetSize: 4 });

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
    } = renderStartScreen({ fleetSize: 4 });

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
