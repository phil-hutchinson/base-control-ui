// One side's score cell: an arcade digit readout and two rows of pips —
// the nodes that side currently holds, and the depleted nodes its ships are
// standing on. All three are decorative (`aria-hidden`) — the true total
// and both counts reach assistive technology through a visually hidden
// sentence from `announcements.ts`.

import { scoreSentence } from "../board/announcements";
import {
  chargedNodesHeldBy,
  depletedNodesOccupiedBy,
  MAX_DEPLETED_NODES_PRICED,
} from "../rules/energy";
import type { Side } from "../rules/fleet";
import type { GameState } from "../rules/gameState";
import { TARGET_CHARGED_NODES } from "../rules/nodes";
import "./ScoreDisplay.css";

/** The most a turn can pay or cost is 10 (§8.4), so the longest game (90
 * rounds) tops out around 900. Four digits stays anyway, so the arcade
 * readout's fixed width never reflows as the total grows. */
const SCORE_DIGITS = 4;

const SIDE_NAME: Readonly<Record<Side, string>> = {
  green: "Green",
  red: "Red",
};

interface ScoreDisplayProps {
  readonly state: GameState;
  readonly side: Side;
  /** The rolling total to draw, owned by `useDisplayedEnergy` above the HUD. */
  readonly displayedTotal: number;
}

export function ScoreDisplay({
  state,
  side,
  displayedTotal,
}: ScoreDisplayProps) {
  const nodesHeld = chargedNodesHeldBy(state, side).length;
  const depletedOccupied = depletedNodesOccupiedBy(state, side).length;

  return (
    <div className={`score-display score-display--${side}`}>
      <span className="score-display__name" aria-hidden="true">
        {SIDE_NAME[side]}
      </span>
      <span className="score-display__digits" aria-hidden="true">
        {displayedTotal.toString().padStart(SCORE_DIGITS, "0")}
      </span>
      <span className="score-display__pips" aria-hidden="true">
        {Array.from({ length: TARGET_CHARGED_NODES }, (_, index) => (
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
      <span
        className={
          depletedOccupied > 0
            ? "score-display__depleted-pips"
            : "score-display__depleted-pips score-display__depleted-pips--empty"
        }
        aria-hidden="true"
      >
        {Array.from({ length: MAX_DEPLETED_NODES_PRICED }, (_, index) => (
          <span
            key={index}
            className={
              index < depletedOccupied
                ? "score-display__depleted-pip score-display__depleted-pip--on"
                : "score-display__depleted-pip"
            }
          />
        ))}
      </span>
      <span className="visually-hidden">{scoreSentence(state, side)}</span>
    </div>
  );
}
