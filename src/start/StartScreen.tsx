// The start screen: the app's front door. Carries the game's on-screen
// name, the options a player sets before a game begins — seven of them,
// eight under the steal playstyle, which alone offers player-matching nodes
// and shows a Planet effects group in place of the Planet bonus group — and
// the PLAY button. Each group's title carries a question mark that opens a
// short tip explaining the option (`optionTips.ts`). Rendered by `App` in
// place of the game whenever there is no game in progress.

import { type ReactNode, useCallback, useId, useState } from "react";
import { GAME_NAME } from "../gameName";
import { type ClockSetting, CLOCK_SETTINGS } from "../rules/clock";
import { type FleetSize, FLEET_SIZES } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import { type NodePlaystyle, NODE_PLAYSTYLES } from "../rules/nodePlaystyle";
import { type ChargedNodeCount, CHARGED_NODE_COUNTS } from "../rules/nodes";
import {
  type PlanetActivitySetting,
  PLANET_ACTIVITY_SETTINGS,
} from "../rules/planetActivity";
import {
  type PlanetBonusSetting,
  PLANET_BONUS_SETTINGS,
} from "../rules/planetBonus";
import {
  type PlayerMatchingSetting,
  PLAYER_MATCHING_SETTINGS,
} from "../rules/playerMatching";
import { type ScoringSetting, SCORING_SETTINGS } from "../rules/scoring";
import { respell } from "../spelling/spelling";
import { useSpelling } from "../spelling/spellingContext";
import { type OptionGroupId, OPTION_TIPS } from "./optionTips";
import { useTipDismissal } from "./useTipDismissal";
import "./StartScreen.css";

/** Each option group's title — start-screen chrome, not a rules concern. */
const OPTION_GROUP_TITLES: Record<OptionGroupId, string> = {
  nodePlaystyle: "Node playstyle",
  fleetSize: "Ships",
  chargedNodeCount: "Charged nodes",
  playerMatching: "Player-matching nodes",
  scoring: "Node scoring",
  planetActivity: "Planet effects",
  planetBonus: "Planet bonus",
  lengthInRounds: "Rounds",
  clockSetting: "Clock (time per turn)",
};

/** The Clock group's labels — start-screen chrome, not a rules concern. */
const CLOCK_SETTING_LABELS: Record<ClockSetting, string> = {
  none: "UNLIMITED",
  6: "6s",
  4: "4s",
  2: "2s",
};

/** The Node scoring group's labels — start-screen chrome, not a rules concern. */
const SCORING_SETTING_LABELS: Record<ScoringSetting, string> = {
  simple: "SIMPLE",
  bonus: "BONUS",
};

/** The Planet bonus group's labels — start-screen chrome, not a rules concern. */
const PLANET_BONUS_SETTING_LABELS: Record<PlanetBonusSetting, string> = {
  off: "OFF",
  two: "2 POINTS",
  three: "3 POINTS",
};

/**
 * The Planet effects group's labels — start-screen chrome, not a rules
 * concern.
 */
const PLANET_ACTIVITY_SETTING_LABELS: Record<PlanetActivitySetting, string> = {
  off: "OFF",
  stable: "STABLE",
  race: "RACE",
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

interface StartScreenProps {
  readonly fleetSize: FleetSize;
  readonly onFleetSizeChange: (fleetSize: FleetSize) => void;
  readonly chargedNodeCount: ChargedNodeCount;
  readonly onChargedNodeCountChange: (
    chargedNodeCount: ChargedNodeCount,
  ) => void;
  readonly scoring: ScoringSetting;
  readonly onScoringChange: (scoring: ScoringSetting) => void;
  readonly planetBonus: PlanetBonusSetting;
  readonly onPlanetBonusChange: (planetBonus: PlanetBonusSetting) => void;
  readonly planetActivity: PlanetActivitySetting;
  readonly onPlanetActivityChange: (
    planetActivity: PlanetActivitySetting,
  ) => void;
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
 * is pressed. The only state this component holds, beyond the ids it
 * generates for its radio groups, is which group's tip is open, if any;
 * opening or closing a tip never calls an option handler. Changing an option
 * only calls the matching handler — it dispatches nothing and starts no
 * game. The
 * Player-matching nodes group renders only while the node playstyle is
 * steal, so the caller's `playerMatching` value is otherwise unused chrome.
 * In the same position, the Planet effects group renders under steal and
 * the Planet bonus group under every other playstyle, so only one of
 * `planetBonus` and `planetActivity` is ever shown; each keeps its own value
 * while hidden.
 */
export function StartScreen({
  fleetSize,
  onFleetSizeChange,
  chargedNodeCount,
  onChargedNodeCountChange,
  scoring,
  onScoringChange,
  planetBonus,
  onPlanetBonusChange,
  planetActivity,
  onPlanetActivityChange,
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
  const planetActivityGroupName = useId();
  const nodePlaystyleGroupName = useId();
  const playerMatchingGroupName = useId();
  const lengthGroupName = useId();
  const clockSettingGroupName = useId();
  const [openTip, setOpenTip] = useState<OptionGroupId | null>(null);
  const closeTip = useCallback(() => setOpenTip(null), []);
  const toggleTip = useCallback(
    (groupId: OptionGroupId) =>
      setOpenTip((current) => (current === groupId ? null : groupId)),
    [],
  );
  useTipDismissal(openTip, closeTip);
  const tipProps = { openTip, onToggleTip: toggleTip };

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
      <OptionGroup groupId="nodePlaystyle" {...tipProps}>
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
      </OptionGroup>
      <OptionGroup groupId="fleetSize" {...tipProps}>
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
      </OptionGroup>
      <OptionGroup groupId="chargedNodeCount" {...tipProps}>
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
      </OptionGroup>
      {nodePlaystyle === "steal" ? (
        <OptionGroup groupId="playerMatching" {...tipProps}>
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
        </OptionGroup>
      ) : null}
      <OptionGroup groupId="scoring" {...tipProps}>
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
      </OptionGroup>
      {nodePlaystyle === "steal" ? (
        <OptionGroup groupId="planetActivity" {...tipProps}>
          {PLANET_ACTIVITY_SETTINGS.map((value) => (
            <OptionChoice
              key={value}
              name={planetActivityGroupName}
              value={value}
              label={PLANET_ACTIVITY_SETTING_LABELS[value]}
              checked={value === planetActivity}
              onChange={() => onPlanetActivityChange(value)}
            />
          ))}
        </OptionGroup>
      ) : (
        <OptionGroup groupId="planetBonus" {...tipProps}>
          {PLANET_BONUS_SETTINGS.map((value) => (
            <OptionChoice
              key={value}
              name={planetBonusGroupName}
              value={value}
              label={PLANET_BONUS_SETTING_LABELS[value]}
              checked={value === planetBonus}
              onChange={() => onPlanetBonusChange(value)}
            />
          ))}
        </OptionGroup>
      )}
      <OptionGroup groupId="lengthInRounds" {...tipProps}>
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
      </OptionGroup>
      <OptionGroup groupId="clockSetting" {...tipProps}>
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
      </OptionGroup>
      <button type="button" className="start-screen__play" onClick={onPlay}>
        Play
      </button>
    </div>
  );
}

interface OptionGroupProps {
  readonly groupId: OptionGroupId;
  readonly openTip: OptionGroupId | null;
  readonly onToggleTip: (groupId: OptionGroupId) => void;
  readonly children: ReactNode;
}

/**
 * One option group: its title, the question mark that opens and closes its
 * tip, the tip itself (always rendered, hidden while closed), and its
 * choices. The group is named by its title alone, not by the question mark
 * beside it.
 */
function OptionGroup({
  groupId,
  openTip,
  onToggleTip,
  children,
}: OptionGroupProps) {
  const titleId = useId();
  const tipId = useId();
  const spelling = useSpelling();
  const title = OPTION_GROUP_TITLES[groupId];
  const tip = OPTION_TIPS[groupId];
  const open = openTip === groupId;
  return (
    <fieldset className="start-screen__options" aria-labelledby={titleId}>
      <legend className="start-screen__legend">
        <span id={titleId}>{title}</span>
        <button
          type="button"
          className="start-screen__tip-toggle"
          aria-label={`About ${title}`}
          aria-expanded={open}
          aria-controls={tipId}
          data-tip-toggle={groupId}
          onClick={() => onToggleTip(groupId)}
        >
          ?
        </button>
      </legend>
      <div id={tipId} className="start-screen__tip" hidden={!open}>
        {tip.intro === undefined ? null : (
          <p className="start-screen__tip-intro">
            {respell(tip.intro, spelling)}
          </p>
        )}
        {tip.choices === undefined ? null : (
          <ul className="start-screen__tip-choices">
            {tip.choices.map(({ choice, text }) => (
              <li key={choice}>
                <strong>{`${choice}:`}</strong> {respell(text, spelling)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="start-screen__choices">{children}</div>
    </fieldset>
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
