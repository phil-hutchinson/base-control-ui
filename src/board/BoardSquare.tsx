// One square's stacked contents: the site marker beneath any ship standing
// on it, then, during ship selection, one of three selection markings — a
// legal destination, a legal attack target, or the selected ship's own
// square — all sharing the square in a single-cell grid rather than
// absolute positioning (see BoardSquare.css). A target's predicted outcome
// is spoken, not drawn: the ring here is a plain cue, the same for a win, a
// loss or a mutual return.
//
// A bay's return-position cues (rules.md §7.1) are drawn as small corner
// triangles, on screen all game regardless of selection: solid for the
// current receptacle, a stroked line alone for return position 1. The
// receptacle is the bay that will actually take the next beaten ship, so it
// carries the heavier mark; position 1 is the rule behind it. Each triangle
// is a single new line closing a corner of the square's own border, which
// already supplies the triangle's other two sides. Where a bay is both,
// only the solid triangle is drawn, and the accessible name says both.
// Where no bay is empty at all, only position 1's outline is drawn,
// correctly saying there is nowhere for a beaten ship to go.
//
// Having moved this ply and a ship's condition (no action available, or
// owing an action) are separate, independently optional fields from each
// other and from the selection mark, so a square can carry any combination
// of the three at once. A ship with no legal action available at all —
// because it is pinned, because it has moved and has no attack target left,
// or because an obligation elsewhere in the fleet is holding it back — is
// drawn dampened; a ship that owes an action blinks between full and
// dampened opacity instead, its static mark alone carrying the meaning under
// prefers-reduced-motion. Having moved never dampens a ship by itself: it
// stays a plain fact, drawn as a bar at the square's top edge so it cannot
// collide with a condition mark at the bottom.

import type { CSSProperties } from "react";
import type {
  ReturnCue,
  ShipCondition,
  SquareMark,
  SquareOccupant,
} from "./squareLabel";
import type { SiteState } from "../rules/sites";
import { ShipIcon } from "./ShipIcon";
import { SiteMarker } from "./SiteMarker";
import "./BoardSquare.css";

export interface BoardSquareProps {
  readonly isBay: boolean;
  readonly squareName: string;
  readonly siteState?: SiteState;
  readonly returnCue?: ReturnCue;
  readonly occupant?: SquareOccupant;
  readonly hasActed?: boolean;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

// Geometry for the markings, in the same 0-100 viewBox ShipIcon and
// SiteMarker use, so they scale with the square exactly as those do.
const DESTINATION_DISC_RADIUS = 9;
const TARGET_RING_RADIUS = 32;
const TARGET_RING_STROKE_WIDTH = 6;
const SELECTED_BRACKET_INSET = 9;
const SELECTED_BRACKET_LENGTH = 20;
const SELECTED_STROKE_WIDTH = 6;
const CONDITION_BAR_WIDTH = 30;
const CONDITION_BAR_HEIGHT = 5;
const CONDITION_BAR_BOTTOM_INSET = 8;
const CONDITION_BAR_STROKE_WIDTH = 2;
const ALREADY_ACTED_BAR_TOP_INSET = 8;
const CHEVRON_WIDTH = 24;
const CHEVRON_HEIGHT = 10;
const CHEVRON_BOTTOM_INSET = 8;
const CHEVRON_STROKE_WIDTH = 5;
const DAMPENED_OPACITY = 0.45;
const RETURN_CUE_TRIANGLE_LEG = 22;
const RETURN_CUE_STROKE_WIDTH = 4;

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

/**
 * The square's four true corners, for the return-position cues: unlike
 * `BRACKET_CORNERS` these sit exactly at the square's edge, not inset, so
 * the triangle's two short legs run along the square's own border.
 */
const RETURN_CUE_CORNERS: readonly BracketCorner[] = [
  { x: 0, y: 0, armX: 1, armY: 1 },
  { x: 100, y: 0, armX: -1, armY: 1 },
  { x: 100, y: 100, armX: -1, armY: -1 },
  { x: 0, y: 100, armX: 1, armY: -1 },
];

/**
 * One corner's filled triangle: the corner point and the two points
 * `RETURN_CUE_TRIANGLE_LEG` along each edge, closed. The two edges along
 * the square's own border are only nominal — the square's real border
 * already draws them — so the only line this path adds that is not already
 * on screen is the diagonal closing it.
 */
function cornerTrianglePath({ x, y, armX, armY }: BracketCorner): string {
  const alongX = x + armX * RETURN_CUE_TRIANGLE_LEG;
  const alongY = y + armY * RETURN_CUE_TRIANGLE_LEG;
  return `M ${x} ${y} L ${alongX} ${y} L ${x} ${alongY} Z`;
}

/** One corner's diagonal alone: the same triangle's hypotenuse, with no line drawn along the square's own border. */
function cornerDiagonal({ x, y, armX, armY }: BracketCorner) {
  return {
    x1: x + armX * RETURN_CUE_TRIANGLE_LEG,
    y1: y,
    x2: x,
    y2: y + armY * RETURN_CUE_TRIANGLE_LEG,
  };
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

/**
 * A large hollow ring marking a square the selected ship may legally
 * attack, centred on the square so it reads around an enemy ship icon
 * rather than under one. Distinct from the destination's small solid disc
 * by both shape and size, so the two survive greyscale.
 */
function TargetMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--target"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle
        cx={50}
        cy={50}
        r={TARGET_RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={TARGET_RING_STROKE_WIDTH}
      />
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

/**
 * Solid corner triangles marking the bay a beaten ship would actually land
 * in right now (rules.md §7.1) — the receptacle. It is the more important of
 * the two return cues nearly all the time, since it is where a ship is about
 * to land, so it carries the heavier mark. Drawn instead of position 1's
 * outline where a bay is both, since an outline beneath a solid triangle of
 * the same geometry would be invisible.
 */
function ReceptacleMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--receptacle"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {RETURN_CUE_CORNERS.map((corner) => (
        <path
          key={`${corner.x}-${corner.y}`}
          d={cornerTrianglePath(corner)}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Stroked corner triangles (their diagonal alone) marking return position 1 (rules.md §7.1), on screen for that bay all game regardless of selection. */
function ReturnPositionMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--return-position"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {RETURN_CUE_CORNERS.map((corner) => {
        const { x1, y1, x2, y2 } = cornerDiagonal(corner);
        return (
          <line
            key={`${corner.x}-${corner.y}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth={RETURN_CUE_STROKE_WIDTH}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** A short solid bar near the square's top edge, marking a ship that has already acted this ply. */
function AlreadyActedMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--already-acted"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect
        x={50 - CONDITION_BAR_WIDTH / 2}
        y={ALREADY_ACTED_BAR_TOP_INSET}
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
  squareName,
  siteState,
  returnCue,
  occupant,
  hasActed,
  condition,
  mark,
}: BoardSquareProps) {
  const classNames = ["board-square"];
  if (isBay) {
    classNames.push("board-square--bay");
  }
  const isDampened = condition === "no-action";
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
      {siteState && <SiteMarker state={siteState} squareName={squareName} />}
      {(returnCue === "receptacle" ||
        returnCue === "return-position-and-receptacle") && <ReceptacleMark />}
      {returnCue === "return-position" && <ReturnPositionMark />}
      {occupant && <ShipIcon side={occupant.side} shields={occupant.shields} />}
      {mark === "destination" && <DestinationMark />}
      {mark === "selected" && <SelectedMark />}
      {typeof mark === "object" && mark.kind === "target" && <TargetMark />}
      {hasActed && <AlreadyActedMark />}
      {condition === "no-action" && <NoActionMark />}
      {condition === "owes-action" && <OwesActionMark />}
    </div>
  );
}
