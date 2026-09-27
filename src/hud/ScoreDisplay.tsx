// One side's score cell: an arcade digit readout and a row of pips for the
// nodes that side currently holds. Both are decorative (`aria-hidden`) — the
// true total and the count reach assistive technology through a visually
// hidden sentence from `announcements.ts`.

import { scoreSentence } from "../board/announcements";
import { energyForNodesHeld, turnCollection } from "../rules/energy";
import type { Side } from "../rules/fleet";
import type { GameState } from "../rules/gameState";
import "./ScoreDisplay.css";

/** The most a turn can pay is whatever the chosen setting pays for the
 * board's charged-node count (§8.4) — 15 at bonus with five nodes held, or,
 * under DOUBLE (steal.md §9), one more with the own node counted twice, 21
 * at bonus. Over the longest offered game, 90 rounds, that reaches
 * roughly 1,890, so four digits still comfortably covers it and the arcade
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
  const collection = turnCollection(state, side);
  // A ship holds a charged node by standing on it, so the most this side
  // could ever hold at once is the smaller of its own ship count and the
  // board's charged-node count — the row is drawn that long, never the
  // board's count alone, so a fleet smaller than the board is never shown
  // pips it could not light. DOUBLE (steal.md §9) can price one more than
  // that (the own node counted twice), so the row grows by one to still
  // reach the most a turn can pay.
  const shipCount = state.ships.filter((ship) => ship.side === side).length;
  const pipCount =
    Math.min(shipCount, state.chargedNodeCount) +
    (state.playerMatching === "double" ? 1 : 0);
  // The layout (App.css) is sized for the five-pip row a five-node board
  // without DOUBLE could already show; only DOUBLE's extra pip can exceed
  // it, so a row longer than five is the one that needs to shrink.
  const isLongRow = pipCount > 5;
  // REQUIRED (steal.md §9) withholds the turn's whole collection while the
  // side holds a node but not its own: no pip lights, each held node's pip
  // draws an X instead, and no value is highlighted.
  const litCount = collection.withheld ? 0 : collection.countedNodes;
  const xCount = collection.withheld ? collection.heldSquares.length : 0;

  return (
    <div className={`score-display score-display--${side}`}>
      <span className="score-display__name" aria-hidden="true">
        {SIDE_NAME[side]}
      </span>
      <span className="score-display__digits" aria-hidden="true">
        {displayedTotal.toString().padStart(SCORE_DIGITS, "0")}
      </span>
      <span
        className={
          isLongRow
            ? "score-display__pips score-display__pips--long"
            : "score-display__pips"
        }
        aria-hidden="true"
      >
        {Array.from({ length: pipCount }, (_, index) => {
          const count = index + 1;
          let pipClassName = "score-display__pip";
          if (index < xCount) {
            pipClassName += " score-display__pip--x";
          } else if (index < litCount) {
            pipClassName += " score-display__pip--lit";
          }
          return (
            <span key={index} className="score-display__pip-column">
              <span className={pipClassName} />
              <span
                className={
                  count === litCount
                    ? `score-display__pip-value score-display__pip-value--${side}`
                    : "score-display__pip-value"
                }
              >
                {energyForNodesHeld(count, state.scoring)}
              </span>
            </span>
          );
        })}
      </span>
      <span className="visually-hidden">{scoreSentence(state, side)}</span>
    </div>
  );
}
