// The round counter, centred between the two scores: the round the game is
// in against the game's own length, so a game started at a different length
// reads correctly without this component being touched.

import {
  roundCounterSpokenText,
  roundCounterText,
} from "../board/announcements";
import type { GameState } from "../rules/gameState";
import "./RoundCounter.css";

interface RoundCounterProps {
  readonly state: GameState;
}

export function RoundCounter({ state }: RoundCounterProps) {
  return (
    <div className="round-counter">
      <span className="round-counter__label" aria-hidden="true">
        Round
      </span>
      <span className="round-counter__value" aria-hidden="true">
        {roundCounterText(state)}
      </span>
      <span className="visually-hidden">{roundCounterSpokenText(state)}</span>
    </div>
  );
}
