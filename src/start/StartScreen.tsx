// The start screen: the app's front door. Carries the game's on-screen
// name, the options a player sets before a game begins — eight of them,
// nine under the steal playstyle, which alone offers player-matching nodes
// and, alone among the Planet bonus group's four settings, ADVANCED
// (`offeredPlanetBonusSettings`) — and the PLAY button. Rendered by `App` in
// place of the game whenever there is no game in progress.

import { useId } from "react";
import { GAME_NAME } from "../gameName";
import { type ClockSetting, CLOCK_SETTINGS } from "../rules/clock";
import { COMBAT_SETTINGS } from "../rules/combatSetting";
import { type FleetSize, FLEET_SIZES } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import { type NodePlaystyle, NODE_PLAYSTYLES } from "../rules/nodePlaystyle";
import { type ChargedNodeCount, CHARGED_NODE_COUNTS } from "../rules/nodes";
import {
  offeredPlanetBonusSettings,
  type PlanetBonusSetting,
} from "../rules/planetBonus";
import {
  type PlayerMatchingSetting,
  PLAYER_MATCHING_SETTINGS,
} from "../rules/playerMatching";
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

/** The Planet bonus group's labels — start-screen chrome, not a rules concern. */
const PLANET_BONUS_SETTING_LABELS: Record<PlanetBonusSetting, string> = {
  off: "OFF",
  two: "2 POINTS",
  three: "3 POINTS",
  advanced: "ADVANCED",
};

/**
 * The Player-matching nodes group's labels — start-screen chrome, not a
 * rules concern.
 */
const PLAYER_MATCHING_LABELS: Record<PlayerMatchingSetting, string> = {
  off: "OFF",
  double: "DOUBLE",
  required: "REQUIRED",
};

/**
 * The Node playstyle group's labels — start-screen chrome, not a
 * rules concern.
 */
const NODE_PLAYSTYLE_LABELS: Record<NodePlaystyle, string> = {
  continuous: "CONTINUOUS",
  planet: "PLANET",
  dedicated: "DEDICATED",
  steal: "STEAL",
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
  readonly planetBonus: PlanetBonusSetting;
  readonly onPlanetBonusChange: (planetBonus: PlanetBonusSetting) => void;
  readonly nodePlaystyle: NodePlaystyle;
  readonly onNodePlaystyleChange: (nodePlaystyle: NodePlaystyle) => void;
  readonly playerMatching: PlayerMatchingSetting;
  readonly onPlayerMatchingChange: (
    playerMatching: PlayerMatchingSetting,
  ) => void;
  readonly lengthInRounds: number;
  readonly onLengthInRoundsChange: (lengthInRounds: number) => void;
  readonly clockSetting: ClockSetting;
  readonly onClockSettingChange: (clockSetting: ClockSetting) => void;
  readonly onPlay: () => void;
  readonly onOpenGuide: () => void;
}

/**
 * Controlled: the options are held by the caller and mean nothing until PLAY
 * is pressed. This component holds no state of its own beyond the ids it
 * generates for its radio groups, and changing an option only calls the
 * matching handler — it dispatches nothing and starts no game. The
 * Player-matching nodes group renders only while the node playstyle is
 * steal, so the caller's `playerMatching` value is otherwise unused chrome.
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
  planetBonus,
  onPlanetBonusChange,
  nodePlaystyle,
  onNodePlaystyleChange,
  playerMatching,
  onPlayerMatchingChange,
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
  const planetBonusGroupName = useId();
  const nodePlaystyleGroupName = useId();
  const playerMatchingGroupName = useId();
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
        <legend className="start-screen__legend">Node playstyle</legend>
        <div className="start-screen__choices">
          {NODE_PLAYSTYLES.map((value) => (
            <OptionChoice
              key={value}
              name={nodePlaystyleGroupName}
              value={value}
              label={NODE_PLAYSTYLE_LABELS[value]}
              checked={value === nodePlaystyle}
              onChange={() => onNodePlaystyleChange(value)}
            />
          ))}
        </div>
      </fieldset>
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
      {nodePlaystyle === "steal" ? (
        <fieldset className="start-screen__options">
          <legend className="start-screen__legend">
            Player-matching nodes
          </legend>
          <div className="start-screen__choices">
            {PLAYER_MATCHING_SETTINGS.map((value) => (
              <OptionChoice
                key={value}
                name={playerMatchingGroupName}
                value={value}
                label={PLAYER_MATCHING_LABELS[value]}
                checked={value === playerMatching}
                onChange={() => onPlayerMatchingChange(value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
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
        <legend className="start-screen__legend">Planet bonus</legend>
        <div className="start-screen__choices">
          {offeredPlanetBonusSettings(nodePlaystyle).map((value) => (
            <OptionChoice
              key={value}
              name={planetBonusGroupName}
              value={value}
              label={PLANET_BONUS_SETTING_LABELS[value]}
              checked={value === planetBonus}
              onChange={() => onPlanetBonusChange(value)}
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
