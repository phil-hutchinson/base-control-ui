// The start screen: the app's front door. Carries the game's on-screen
// name, the two options a player sets before a game begins, and the PLAY
// button. Rendered by `App` in place of the game whenever there is no game
// in progress.

import { useId } from "react";
import { GAME_NAME } from "../gameName";
import { type FleetSize, FLEET_SIZES } from "../rules/fleet";
import { GAME_LENGTH_OPTIONS_ROUNDS } from "../rules/gameLength";
import "./StartScreen.css";

interface StartScreenProps {
  readonly fleetSize: FleetSize;
  readonly onFleetSizeChange: (fleetSize: FleetSize) => void;
  readonly lengthInRounds: number;
  readonly onLengthInRoundsChange: (lengthInRounds: number) => void;
  readonly onPlay: () => void;
}

/**
 * Controlled: the two options are held by the caller and mean nothing until
 * PLAY is pressed. This component holds no state of its own beyond the ids
 * it generates for its radio groups, and changing an option only calls the
 * matching handler — it dispatches nothing and starts no game.
 */
export function StartScreen({
  fleetSize,
  onFleetSizeChange,
  lengthInRounds,
  onLengthInRoundsChange,
  onPlay,
}: StartScreenProps) {
  const fleetSizeGroupName = useId();
  const lengthGroupName = useId();

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
              checked={value === fleetSize}
              onChange={() => onFleetSizeChange(value)}
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
              checked={value === lengthInRounds}
              onChange={() => onLengthInRoundsChange(value)}
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
  readonly value: number;
  readonly checked: boolean;
  readonly onChange: () => void;
}

/** One radio in an option group: a visually hidden input with a styled label. */
function OptionChoice({ name, value, checked, onChange }: OptionChoiceProps) {
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
        {value}
      </label>
    </span>
  );
}
