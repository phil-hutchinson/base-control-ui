// The start screen: the app's front door. Carries the game's on-screen
// name, the four options a player sets before a game begins, and the PLAY
// button. Rendered by `App` in place of the game whenever there is no game
// in progress.

import { useId } from "react";
import { GAME_NAME } from "../gameName";
import { type ClockSetting, CLOCK_SETTINGS } from "../rules/clock";
import { type FleetSize, FLEET_SIZES } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import { type ChargedNodeCount, CHARGED_NODE_COUNTS } from "../rules/nodes";
import "./StartScreen.css";

/** The Clock group's labels — start-screen chrome, not a rules concern. */
const CLOCK_SETTING_LABELS: Record<ClockSetting, string> = {
  none: "UNLIMITED",
  6: "6s",
  4: "4s",
  2: "2s",
};

interface StartScreenProps {
  readonly fleetSize: FleetSize;
  readonly onFleetSizeChange: (fleetSize: FleetSize) => void;
  readonly chargedNodeCount: ChargedNodeCount;
  readonly onChargedNodeCountChange: (
    chargedNodeCount: ChargedNodeCount,
  ) => void;
  readonly lengthInRounds: number;
  readonly onLengthInRoundsChange: (lengthInRounds: number) => void;
  readonly clockSetting: ClockSetting;
  readonly onClockSettingChange: (clockSetting: ClockSetting) => void;
  readonly onPlay: () => void;
}

/**
 * Controlled: the four options are held by the caller and mean nothing
 * until PLAY is pressed. This component holds no state of its own beyond
 * the ids it generates for its radio groups, and changing an option only
 * calls the matching handler — it dispatches nothing and starts no game.
 */
export function StartScreen({
  fleetSize,
  onFleetSizeChange,
  chargedNodeCount,
  onChargedNodeCountChange,
  lengthInRounds,
  onLengthInRoundsChange,
  clockSetting,
  onClockSettingChange,
  onPlay,
}: StartScreenProps) {
  const fleetSizeGroupName = useId();
  const chargedNodeCountGroupName = useId();
  const lengthGroupName = useId();
  const clockSettingGroupName = useId();

  return (
    <div className="start-screen">
      <h1 className="start-screen__title">{GAME_NAME}</h1>
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
