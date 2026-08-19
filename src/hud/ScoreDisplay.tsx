// One side's score cell: an arcade digit readout and a row of pips showing
// how many nodes that side currently holds. Both are decorative
// (`aria-hidden`) — the true total and node count reach assistive
// technology through a visually hidden sentence from `announcements.ts`.

import { scoreSentence } from "../board/announcements";
import { chargedNodesHeldBy } from "../rules/energy";
import type { Side } from "../rules/fleet";
import type { GameState } from "../rules/gameState";
import "./ScoreDisplay.css";

/** §8.1: exactly five sites are ever active or charged, so a side can never
 * hold more than five nodes at once — the pip row is a fixed five. */
const NODES_IN_PLAY = 5;

/** A hundred-round game pays at most 15 x 100 = 1500, so four digits is the
 * width that never reflows as the total grows. */
const SCORE_DIGITS = 4;

const SIDE_NAME: Readonly<Record<Side, string>> = {
  green: "Green",
  red: "Red",
};

interface ScoreDisplayProps {
  readonly state: GameState;
  readonly side: Side;
}

export function ScoreDisplay({ state, side }: ScoreDisplayProps) {
  const nodesHeld = chargedNodesHeldBy(state, side).length;

  return (
    <div className={`score-display score-display--${side}`}>
      <span className="score-display__name" aria-hidden="true">
        {SIDE_NAME[side]}
      </span>
      <span className="score-display__digits" aria-hidden="true">
        {state.energy[side].toString().padStart(SCORE_DIGITS, "0")}
      </span>
      <span className="score-display__pips" aria-hidden="true">
        {Array.from({ length: NODES_IN_PLAY }, (_, index) => (
          <span
            key={index}
            className={
              index < nodesHeld
                ? "score-display__pip score-display__pip--lit"
                : "score-display__pip"
            }
          />
        ))}
      </span>
      <span className="visually-hidden">{scoreSentence(state, side)}</span>
    </div>
  );
}
