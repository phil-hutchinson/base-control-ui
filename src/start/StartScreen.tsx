// The start screen: the app's front door. Carries the game's on-screen
// name, the seven options a player sets before a game begins, and the PLAY
// button. Rendered by `App` in place of the game whenever there is no game
// in progress.

import { useId } from "react";
import { GAME_NAME } from "../gameName";
import { type ClockSetting, CLOCK_SETTINGS } from "../rules/clock";
import { COMBAT_SETTINGS } from "../rules/combatSetting";
import { type FleetSize, FLEET_SIZES } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import {
  type NodeRotationSetting,
  NODE_ROTATION_SETTINGS,
} from "../rules/nodeRotation";
import { type ChargedNodeCount, CHARGED_NODE_COUNTS } from "../rules/nodes";
import { type ScoringSetting, SCORING_SETTINGS } from "../rules/scoring";
import "./StartScreen.css";

/** The Clock group's labels — start-screen chrome, not a rules concern. */
const CLOCK_SETTING_LABELS: Record<ClockSetting, string> = {
  none: "UNLIMITED",
  6: "6s",
  4: "4s",
  2: "2s",
};

/** The Combat group's labels — start-screen chrome, not a rules concern. */
const COMBAT_SETTING_LABELS: Record<"off" | "on", string> = {
  off: "OFF",
  on: "ON",
};

/** The Scoring group's labels — start-screen chrome, not a rules concern. */
const SCORING_SETTING_LABELS: Record<ScoringSetting, string> = {
  simple: "SIMPLE",
  bonus: "BONUS",
};

/**
 * The Inactive node rotation group's labels — start-screen chrome, not a
 * rules concern.
 */
const NODE_ROTATION_SETTING_LABELS: Record<NodeRotationSetting, string> = {
  continuous: "CONTINUOUS",
  planet: "PLANET",
  dedicated: "DEDICATED",
};

/** The Combat group's radio `value` attributes, one per offered setting. */
function combatSettingValue(combatEnabled: boolean): "off" | "on" {
  return combatEnabled ? "on" : "off";
}

interface StartScreenProps {
  readonly fleetSize: FleetSize;
  readonly onFleetSizeChange: (fleetSize: FleetSize) => void;
  readonly chargedNodeCount: ChargedNodeCount;
  readonly onChargedNodeCountChange: (
    chargedNodeCount: ChargedNodeCount,
  ) => void;
  readonly combatEnabled: boolean;
  readonly onCombatEnabledChange: (combatEnabled: boolean) => void;
  readonly scoring: ScoringSetting;
  readonly onScoringChange: (scoring: ScoringSetting) => void;
  readonly nodeRotation: NodeRotationSetting;
  readonly onNodeRotationChange: (nodeRotation: NodeRotationSetting) => void;
  readonly lengthInRounds: number;
  readonly onLengthInRoundsChange: (lengthInRounds: number) => void;
  readonly clockSetting: ClockSetting;
  readonly onClockSettingChange: (clockSetting: ClockSetting) => void;
  readonly onPlay: () => void;
  readonly onOpenGuide: () => void;
}

/**
 * Controlled: the seven options are held by the caller and mean nothing
 * until PLAY is pressed. This component holds no state of its own beyond
 * the ids it generates for its radio groups, and changing an option only
 * calls the matching handler — it dispatches nothing and starts no game.
 */
export function StartScreen({
  fleetSize,
  onFleetSizeChange,
  chargedNodeCount,
  onChargedNodeCountChange,
  combatEnabled,
  onCombatEnabledChange,
  scoring,
  onScoringChange,
  nodeRotation,
  onNodeRotationChange,
  lengthInRounds,
  onLengthInRoundsChange,
  clockSetting,
  onClockSettingChange,
  onPlay,
  onOpenGuide,
}: StartScreenProps) {
  const fleetSizeGroupName = useId();
  const chargedNodeCountGroupName = useId();
  const scoringGroupName = useId();
  const nodeRotationGroupName = useId();
  const combatEnabledGroupName = useId();
  const lengthGroupName = useId();
  const clockSettingGroupName = useId();

  return (
    <div className="start-screen">
      <h1 className="start-screen__title">{GAME_NAME}</h1>
      <button
        type="button"
        className="start-screen__guide"
        onClick={onOpenGuide}
      >
        Quick Guide
      </button>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Ships</legend>
        <div className="start-screen__choices">
          {FLEET_SIZES.map((value) => (
            <OptionChoice
              key={value}
              name={fleetSizeGroupName}
              value={value}
              label={String(value)}
              checked={value === fleetSize}
              onChange={() => onFleetSizeChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Charged nodes</legend>
        <div className="start-screen__choices">
          {CHARGED_NODE_COUNTS.map((value) => (
            <OptionChoice
              key={value}
              name={chargedNodeCountGroupName}
              value={value}
              label={String(value)}
              checked={value === chargedNodeCount}
              onChange={() => onChargedNodeCountChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Scoring</legend>
        <div className="start-screen__choices">
          {SCORING_SETTINGS.map((value) => (
            <OptionChoice
              key={value}
              name={scoringGroupName}
              value={value}
              label={SCORING_SETTING_LABELS[value]}
              checked={value === scoring}
              onChange={() => onScoringChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Inactive node rotation</legend>
        <div className="start-screen__choices">
          {NODE_ROTATION_SETTINGS.map((value) => (
            <OptionChoice
              key={value}
              name={nodeRotationGroupName}
              value={value}
              label={NODE_ROTATION_SETTING_LABELS[value]}
              checked={value === nodeRotation}
              onChange={() => onNodeRotationChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Combat</legend>
        <div className="start-screen__choices">
          {COMBAT_SETTINGS.map((value) => (
            <OptionChoice
              key={combatSettingValue(value)}
              name={combatEnabledGroupName}
              value={combatSettingValue(value)}
              label={COMBAT_SETTING_LABELS[combatSettingValue(value)]}
              checked={value === combatEnabled}
              onChange={() => onCombatEnabledChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Rounds</legend>
        <div className="start-screen__choices">
          {GAME_LENGTH_OPTIONS_ROUNDS.map((value) => (
            <OptionChoice
              key={value}
              name={lengthGroupName}
              value={value}
              label={String(value)}
              checked={value === lengthInRounds}
              onChange={() => onLengthInRoundsChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="start-screen__options">
        <legend className="start-screen__legend">Clock (time per move)</legend>
        <div className="start-screen__choices">
          {CLOCK_SETTINGS.map((value) => (
            <OptionChoice
              key={value}
              name={clockSettingGroupName}
              value={value}
              label={CLOCK_SETTING_LABELS[value]}
              checked={value === clockSetting}
              onChange={() => onClockSettingChange(value)}
            />
          ))}
        </div>
      </fieldset>
      <button type="button" className="start-screen__play" onClick={onPlay}>
        Play
      </button>
    </div>
  );
}

interface OptionChoiceProps {
  readonly name: string;
  readonly value: string | number;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: () => void;
}

/** One radio in an option group: a visually hidden input with a styled label. */
function OptionChoice({
  name,
  value,
  label,
  checked,
  onChange,
}: OptionChoiceProps) {
  const id = useId();
  return (
    <span className="start-screen__choice">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="visually-hidden"
      />
      <label htmlFor={id} className="start-screen__label">
        {label}
      </label>
    </span>
  );
}
