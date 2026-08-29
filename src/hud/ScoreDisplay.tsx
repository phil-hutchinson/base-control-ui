// One side's score cell: an arcade digit readout and two rows of pips —
// the nodes that side currently holds, and the dormant sites its ships are
// standing on. All three are decorative (`aria-hidden`) — the true total
// and both counts reach assistive technology through a visually hidden
// sentence from `announcements.ts`.

import { scoreSentence } from "../board/announcements";
import { chargedNodesHeldBy, dormantSitesOccupiedBy } from "../rules/energy";
import type { Side } from "../rules/fleet";
import type { GameState } from "../rules/gameState";
import "./ScoreDisplay.css";

/** §8.1, §8.2: the board never charges more than five sites at once, so a
 * side can never hold more than five nodes at once — the pip row is a fixed
 * five. */
const NODES_IN_PLAY = 5;

/** §8.4: the dormant-sites penalty is capped at five, so a side standing on
 * six or seven dormant sites lights the same five pips a side on five
 * does. */
const DORMANT_SITES_PRICED = 5;

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
  /** The rolling total to draw, owned by `useDisplayedEnergy` above the HUD. */
  readonly displayedTotal: number;
}

export function ScoreDisplay({
  state,
  side,
  displayedTotal,
}: ScoreDisplayProps) {
  const nodesHeld = chargedNodesHeldBy(state, side).length;
  const dormantOccupied = dormantSitesOccupiedBy(state, side).length;

  return (
    <div className={`score-display score-display--${side}`}>
      <span className="score-display__name" aria-hidden="true">
        {SIDE_NAME[side]}
      </span>
      <span className="score-display__digits" aria-hidden="true">
        {displayedTotal.toString().padStart(SCORE_DIGITS, "0")}
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
      <span
        className={
          dormantOccupied > 0
            ? "score-display__dormant-pips"
            : "score-display__dormant-pips score-display__dormant-pips--empty"
        }
        aria-hidden="true"
      >
        {Array.from({ length: DORMANT_SITES_PRICED }, (_, index) => (
          <span
            key={index}
            className={
              index < dormantOccupied
                ? "score-display__dormant-pip score-display__dormant-pip--on"
                : "score-display__dormant-pip"
            }
          />
        ))}
      </span>
      <span className="visually-hidden">{scoreSentence(state, side)}</span>
    </div>
  );
}
