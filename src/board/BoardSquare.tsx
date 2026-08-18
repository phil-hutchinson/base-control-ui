// One square's stacked contents: the site marker beneath any ship standing
// on it, then, during ship selection, one of three markings — a legal
// destination, the selected ship's own square, or a ship that has already
// moved this ply — all sharing the square in a single-cell grid rather than
// absolute positioning (see BoardSquare.css).

import type { CSSProperties } from "react";
import type { SquareMark, SquareOccupant } from "./squareLabel";
import type { SiteState } from "../rules/sites";
import { ShipIcon } from "./ShipIcon";
import { SiteMarker } from "./SiteMarker";
import "./BoardSquare.css";

export interface BoardSquareProps {
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
  readonly mark?: SquareMark;
}

// Geometry for the three markings, in the same 0-100 viewBox ShipIcon and
// SiteMarker use, so they scale with the square exactly as those do. Named
// here in one place, tunable by eye at the manual gate: legibility, greyscale
// survival and non-collision with a site's rings or a ship's shield arcs
// cannot be checked in a DOM test.
const DESTINATION_DISC_RADIUS = 9;
const SELECTED_BRACKET_INSET = 9;
const SELECTED_BRACKET_LENGTH = 20;
const SELECTED_STROKE_WIDTH = 6;
const SPENT_BAR_WIDTH = 30;
const SPENT_BAR_HEIGHT = 5;
const SPENT_BAR_BOTTOM_INSET = 8;
const SPENT_OPACITY = 0.45;

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

/** A short bar near the square's bottom edge, marking a ship that has already moved this ply. */
function SpentMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--already-moved"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect
        x={50 - SPENT_BAR_WIDTH / 2}
        y={100 - SPENT_BAR_BOTTOM_INSET - SPENT_BAR_HEIGHT}
        width={SPENT_BAR_WIDTH}
        height={SPENT_BAR_HEIGHT}
        fill="currentColor"
      />
    </svg>
  );
}

/** One square's visible contents: a site marker, a ship, and a selection marking, each if present. */
export function BoardSquare({
  isBay,
  siteState,
  occupant,
  mark,
}: BoardSquareProps) {
  const classNames = ["board-square"];
  if (isBay) {
    classNames.push("board-square--bay");
  }
  if (mark === "already-moved") {
    classNames.push("board-square--already-moved");
  }

  // Threads SPENT_OPACITY into BoardSquare.css as the one place it is
  // defined, rather than duplicating the number in the stylesheet.
  const style =
    mark === "already-moved"
      ? ({ "--spent-opacity": SPENT_OPACITY } as CSSProperties)
      : undefined;

  return (
    <div className={classNames.join(" ")} style={style}>
      {siteState && <SiteMarker state={siteState} />}
      {occupant && <ShipIcon side={occupant.side} shields={occupant.shields} />}
      {mark === "destination" && <DestinationMark />}
      {mark === "selected" && <SelectedMark />}
      {mark === "already-moved" && <SpentMark />}
    </div>
  );
}
