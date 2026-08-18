// One square's stacked contents: the site marker beneath any ship standing
// on it, then, during ship selection, one of two selection markings — a
// legal destination or the selected ship's own square — all sharing the
// square in a single-cell grid rather than absolute positioning (see
// BoardSquare.css).
//
// A ship's condition (already moved, no action available, or owing an
// action) is a separate, independently optional field from the selection
// mark, and a square can carry both a condition mark and a selection mark at
// once. A ship with no legal action available — because it has already
// moved, because it is pinned, or because an obligation elsewhere in the
// fleet is holding it back — is drawn dampened; a ship that owes an action
// blinks between full and dampened opacity instead, its static mark alone
// carrying the meaning under prefers-reduced-motion.

import type { CSSProperties } from "react";
import type { ShipCondition, SquareMark, SquareOccupant } from "./squareLabel";
import type { SiteState } from "../rules/sites";
import { ShipIcon } from "./ShipIcon";
import { SiteMarker } from "./SiteMarker";
import "./BoardSquare.css";

export interface BoardSquareProps {
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

// Geometry for the markings, in the same 0-100 viewBox ShipIcon and
// SiteMarker use, so they scale with the square exactly as those do.
const DESTINATION_DISC_RADIUS = 9;
const SELECTED_BRACKET_INSET = 9;
const SELECTED_BRACKET_LENGTH = 20;
const SELECTED_STROKE_WIDTH = 6;
const CONDITION_BAR_WIDTH = 30;
const CONDITION_BAR_HEIGHT = 5;
const CONDITION_BAR_BOTTOM_INSET = 8;
const CONDITION_BAR_STROKE_WIDTH = 2;
const CHEVRON_WIDTH = 24;
const CHEVRON_HEIGHT = 10;
const CHEVRON_BOTTOM_INSET = 8;
const CHEVRON_STROKE_WIDTH = 5;
const DAMPENED_OPACITY = 0.45;

interface BracketCorner {
  readonly x: number;
  readonly y: number;
  readonly armX: 1 | -1;
  readonly armY: 1 | -1;
}

/** The four corners the selected-ship marking's brackets sit at, inset from the square's edges. */
const BRACKET_CORNERS: readonly BracketCorner[] = [
  { x: SELECTED_BRACKET_INSET, y: SELECTED_BRACKET_INSET, armX: 1, armY: 1 },
  {
    x: 100 - SELECTED_BRACKET_INSET,
    y: SELECTED_BRACKET_INSET,
    armX: -1,
    armY: 1,
  },
  {
    x: 100 - SELECTED_BRACKET_INSET,
    y: 100 - SELECTED_BRACKET_INSET,
    armX: -1,
    armY: -1,
  },
  {
    x: SELECTED_BRACKET_INSET,
    y: 100 - SELECTED_BRACKET_INSET,
    armX: 1,
    armY: -1,
  },
];

/** One corner bracket's path: two short arms meeting at the corner point. */
function bracketPath({ x, y, armX, armY }: BracketCorner): string {
  const horizontal = x + armX * SELECTED_BRACKET_LENGTH;
  const vertical = y + armY * SELECTED_BRACKET_LENGTH;
  return `M ${horizontal} ${y} L ${x} ${y} L ${x} ${vertical}`;
}

/** A small solid disc marking a square the selected ship may legally move to. */
function DestinationMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--destination"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle cx={50} cy={50} r={DESTINATION_DISC_RADIUS} fill="currentColor" />
    </svg>
  );
}

/** Four inset corner brackets marking the selected ship's own square. */
function SelectedMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--selected"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {BRACKET_CORNERS.map((corner) => (
        <path
          key={`${corner.armX}-${corner.armY}`}
          d={bracketPath(corner)}
          fill="none"
          stroke="currentColor"
          strokeWidth={SELECTED_STROKE_WIDTH}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** A short solid bar near the square's bottom edge, marking a ship that has already moved this ply. */
function AlreadyMovedMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--already-moved"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect
        x={50 - CONDITION_BAR_WIDTH / 2}
        y={100 - CONDITION_BAR_BOTTOM_INSET - CONDITION_BAR_HEIGHT}
        width={CONDITION_BAR_WIDTH}
        height={CONDITION_BAR_HEIGHT}
        fill="currentColor"
      />
    </svg>
  );
}

/** The same bar, hollow: a ship with no legal action available for a different reason. */
function NoActionMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--no-action"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect
        x={50 - CONDITION_BAR_WIDTH / 2}
        y={100 - CONDITION_BAR_BOTTOM_INSET - CONDITION_BAR_HEIGHT}
        width={CONDITION_BAR_WIDTH}
        height={CONDITION_BAR_HEIGHT}
        fill="none"
        stroke="currentColor"
        strokeWidth={CONDITION_BAR_STROKE_WIDTH}
      />
    </svg>
  );
}

/** A chevron near the bottom edge, pointing up at the ship that owes an action: "this one". */
function OwesActionMark() {
  const tipY = 100 - CHEVRON_BOTTOM_INSET - CHEVRON_HEIGHT;
  const baseY = 100 - CHEVRON_BOTTOM_INSET;
  return (
    <svg
      className="board-square__mark board-square__mark--owes-action"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d={`M ${50 - CHEVRON_WIDTH / 2} ${baseY} L 50 ${tipY} L ${50 + CHEVRON_WIDTH / 2} ${baseY}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={CHEVRON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One square's visible contents: a site marker, a ship, and a selection marking, each if present. */
export function BoardSquare({
  isBay,
  siteState,
  occupant,
  condition,
  mark,
}: BoardSquareProps) {
  const classNames = ["board-square"];
  if (isBay) {
    classNames.push("board-square--bay");
  }
  const isDampened = condition === "already-moved" || condition === "no-action";
  if (isDampened) {
    classNames.push("board-square--dampened");
  }
  if (condition === "owes-action") {
    classNames.push("board-square--owes-action");
  }

  // Threads DAMPENED_OPACITY into BoardSquare.css as the one place it is
  // defined, rather than duplicating the number in the stylesheet. The
  // blinking ship needs the same value as its blink target, so any
  // condition sets it, not only the statically dampened ones.
  const style = condition
    ? ({ "--dampened-opacity": DAMPENED_OPACITY } as CSSProperties)
    : undefined;

  return (
    <div className={classNames.join(" ")} style={style}>
      {siteState && <SiteMarker state={siteState} />}
      {occupant && <ShipIcon side={occupant.side} shields={occupant.shields} />}
      {mark === "destination" && <DestinationMark />}
      {mark === "selected" && <SelectedMark />}
      {condition === "already-moved" && <AlreadyMovedMark />}
      {condition === "no-action" && <NoActionMark />}
      {condition === "owes-action" && <OwesActionMark />}
    </div>
  );
}
