// The result panel: appears once the game has ended, naming the winner or
// the draw with both final totals, and offering a fresh game. Rendered by
// `App.tsx` over the board only while the game is over, and never before.

import { useEffect, useId, useRef } from "react";
import { GAME_OVER_HEADING, resultSentence } from "../board/announcements";
import type { Side } from "../rules/fleet";
import { gameResult } from "../rules/gameLength";
import type { GameState } from "../rules/gameState";
import "./GameOverPanel.css";

const SIDE_NAME: Readonly<Record<Side, string>> = {
  green: "Green",
  red: "Red",
};

const SIDES: readonly Side[] = ["green", "red"];

interface GameOverPanelProps {
  readonly state: GameState;
  readonly onReturnToStart: () => void;
}

/**
 * The finished game's result, focused when it appears (rules.md §9). Not
 * `aria-modal`, and no focus trap: the board behind it refuses every
 * activation once the game is over.
 */
export function GameOverPanel({ state, onReturnToStart }: GameOverPanelProps) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const result = gameResult(state);

  return (
    <div
      ref={panelRef}
      className="game-over-panel"
      role="dialog"
      aria-labelledby={headingId}
      tabIndex={-1}
    >
      <h2 id={headingId} className="game-over-panel__heading">
        {GAME_OVER_HEADING}
      </h2>
      <div className="game-over-panel__scores" aria-hidden="true">
        {SIDES.map((side) => (
          <div
            key={side}
            className={`game-over-panel__score game-over-panel__score--${side}`}
          >
            <span className="game-over-panel__score-name">
              {SIDE_NAME[side]}
            </span>
            <span className="game-over-panel__score-digits">
              {state.energy[side]}
            </span>
          </div>
        ))}
      </div>
      <p className="visually-hidden">{resultSentence(result)}</p>
      <button
        type="button"
        className="game-over-panel__button"
        onClick={onReturnToStart}
      >
        New Game
      </button>
    </div>
  );
}
