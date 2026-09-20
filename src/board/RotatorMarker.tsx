// The rotator's artwork (rules.md §3.3): a round recycling mark, drawn in
// the same square-level slot a node marker occupies (beneath any ship) and
// in its own colour, ROTATOR_COLOR. Purely decorative — a square's
// accessible name already says "rotator" (squareLabel.ts) — so, like every
// other piece of board art, it carries no title or description and is
// hidden from the accessibility tree.
//
// The mark is three arcs of about 70 degrees each, evenly spaced around the
// circle with three equal — and deliberately wide — gaps between them, each
// ending in an arrowhead that continues the arc's own curve — so the whole mark reads as
// turning, the way a recycling symbol does. Exact angles, stroke width and
// arrowhead shape are this drawing's business, not a rule; "about 70" is the
// instruction, not a measurement to hit.
//
// A rotator still on the board when another one is landed on and spent plays
// a turn animation instead of standing still (see `boardAnimations.ts`): the
// whole mark rotates clockwise by a third of a circle, which the arcs' own
// three-fold symmetry lands back on itself. It is drawn only while
// `turnAnimation` is given; without it, the mark's markup is unchanged from
// the plain artwork below.

import type { CSSProperties } from "react";
import type { RotatorTurnAnimation } from "./boardAnimations";
import { ROTATOR_COLOR } from "./squareArt";
import "./RotatorMarker.css";

const CENTER = 50;
const ARC_RADIUS = 34;
const ARC_STROKE_WIDTH = 6;
const ARC_SPAN_DEGREES = 68;
const ARC_COUNT = 3;
const GAP_DEGREES = (360 - ARC_COUNT * ARC_SPAN_DEGREES) / ARC_COUNT;
const SLOT_DEGREES = ARC_SPAN_DEGREES + GAP_DEGREES;

// The angle the turn animation starts from: a third of a circle behind
// where the mark rests, derived from the arc count rather than written as a
// bare 120, so it keeps landing the mark back on itself if the number of
// arcs ever changes. It is negative because the mark finishes unturned and
// the animation only supplies its beginning: travelling from -120 up to 0
// sweeps clockwise, which is the direction a recycling mark turns.
const TURN_START_ANGLE_DEGREES = -360 / ARC_COUNT;

const ARROWHEAD_LENGTH = 14;
const ARROWHEAD_BASE_WIDTH = 13.5;

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A point on the mark's circle, measured clockwise in degrees from the top, matching an on-screen clock face. */
function pointAtAngle(angleDegrees: number, radius = ARC_RADIUS): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(angleRadians),
    y: CENTER - radius * Math.cos(angleRadians),
  };
}

function formatPoint({ x, y }: Point): string {
  return `${x} ${y}`;
}

/** One arc's SVG path, sweeping clockwise from `startDegrees` to `startDegrees + ARC_SPAN_DEGREES`. */
function arcPath(startDegrees: number): string {
  const start = pointAtAngle(startDegrees);
  const end = pointAtAngle(startDegrees + ARC_SPAN_DEGREES);
  return `M ${formatPoint(start)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${formatPoint(end)}`;
}

/**
 * An arrowhead at an arc's leading (clockwise) end, continuing the arc's own
 * curve: a triangle whose tip sits past the endpoint along the arc's tangent
 * there, and whose base straddles the endpoint across the tangent.
 */
function arrowheadPoints(endDegrees: number): string {
  const end = pointAtAngle(endDegrees);
  // The tangent direction of clockwise travel at this angle.
  const tangentAngle = ((endDegrees + 90) * Math.PI) / 180;
  const tangent = { x: Math.sin(tangentAngle), y: -Math.cos(tangentAngle) };
  const perpendicular = { x: -tangent.y, y: tangent.x };

  const tip = {
    x: end.x + tangent.x * ARROWHEAD_LENGTH,
    y: end.y + tangent.y * ARROWHEAD_LENGTH,
  };
  const baseLeft = {
    x: end.x + (perpendicular.x * ARROWHEAD_BASE_WIDTH) / 2,
    y: end.y + (perpendicular.y * ARROWHEAD_BASE_WIDTH) / 2,
  };
  const baseRight = {
    x: end.x - (perpendicular.x * ARROWHEAD_BASE_WIDTH) / 2,
    y: end.y - (perpendicular.y * ARROWHEAD_BASE_WIDTH) / 2,
  };

  return [tip, baseLeft, baseRight].map(formatPoint).join(", ");
}

const ARC_START_ANGLES: readonly number[] = Array.from(
  { length: ARC_COUNT },
  (_, index) => index * SLOT_DEGREES,
);

interface RotatorMarkerProps {
  /**
   * Present while this rotator is playing its turn animation
   * (`boardAnimations.ts`) because another rotator was just landed on and
   * spent.
   */
  readonly turnAnimation?: RotatorTurnAnimation;
}

/** The rotator's mark: six of these may be on the board at once under the dedicated setting (rules.md §3.3). */
export function RotatorMarker({ turnAnimation }: RotatorMarkerProps) {
  const className = turnAnimation
    ? "rotator-marker rotator-marker--turning"
    : "rotator-marker";
  const style = turnAnimation
    ? ({
        "--rotator-turn-angle": `${TURN_START_ANGLE_DEGREES}deg`,
      } as CSSProperties)
    : undefined;

  return (
    <svg
      key={turnAnimation?.runId}
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={style}
    >
      {ARC_START_ANGLES.map((startDegrees) => (
        <g key={startDegrees}>
          <path
            d={arcPath(startDegrees)}
            fill="none"
            stroke={ROTATOR_COLOR}
            strokeWidth={ARC_STROKE_WIDTH}
            strokeLinecap="round"
          />
          <polygon
            points={arrowheadPoints(startDegrees + ARC_SPAN_DEGREES)}
            fill={ROTATOR_COLOR}
          />
        </g>
      ))}
    </svg>
  );
}
