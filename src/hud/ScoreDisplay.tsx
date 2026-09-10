// One side's score cell: an arcade digit readout and a row of pips for the
// nodes that side currently holds. Both are decorative (`aria-hidden`) — the
// true total and the count reach assistive technology through a visually
// hidden sentence from `announcements.ts`.

import { scoreSentence } from "../board/announcements";
import { chargedNodesHeldBy } from "../rules/energy";
import type { Side } from "../rules/fleet";
import type { GameState } from "../rules/gameState";
import "./ScoreDisplay.css";

/** A turn pays at most the chosen number of charged nodes the board holds
 * (§8.1, §8.2, §8.4), so the longest game tops out in the hundreds. Four
 * digits stays anyway, so the arcade readout's fixed width never reflows as
 * the total grows. */
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
  // A ship holds a charged node by standing on it, so the most this side
  // could ever hold at once is the smaller of its own ship count and the
  // board's charged-node count — the row is drawn that long, never the
  // board's count alone, so a fleet smaller than the board is never shown
  // pips it could not light.
  const shipCount = state.ships.filter((ship) => ship.side === side).length;
  const pipCount = Math.min(shipCount, state.chargedNodeCount);

  return (
    <div className={`score-display score-display--${side}`}>
      <span className="score-display__name" aria-hidden="true">
        {SIDE_NAME[side]}
      </span>
      <span className="score-display__digits" aria-hidden="true">
        {displayedTotal.toString().padStart(SCORE_DIGITS, "0")}
      </span>
      <span className="score-display__pips" aria-hidden="true">
        {Array.from({ length: pipCount }, (_, index) => (
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
