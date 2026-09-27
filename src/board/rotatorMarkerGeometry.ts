// The rotator mark's geometry `RotatorMarker.tsx` draws with, pulled into
// its own module because a component file may only export components
// (`react-refresh/only-export-components`). Also used by the advanced
// planet bonus panel's Node scramble symbol (steal.md §10,
// `src/bonus/NodeScrambleSymbol.tsx`), which draws the same three arcs in
// three different colours rather than the rotator's own single colour.
//
// The mark is three arcs of about 70 degrees each, evenly spaced around the
// circle with three equal — and deliberately wide — gaps between them, each
// ending in an arrowhead that continues the arc's own curve — so the whole
// mark reads as turning, the way a recycling symbol does. Exact angles,
// stroke width and arrowhead shape are this drawing's business, not a rule;
// "about 70" is the instruction, not a measurement to hit.

const CENTER = 50;
const ARC_RADIUS = 34;
export const ARC_STROKE_WIDTH = 6;
export const ARC_SPAN_DEGREES = 68;
const ARC_COUNT = 3;
const GAP_DEGREES = (360 - ARC_COUNT * ARC_SPAN_DEGREES) / ARC_COUNT;
const SLOT_DEGREES = ARC_SPAN_DEGREES + GAP_DEGREES;

/**
 * The angle the turn animation starts from: a third of a circle behind
 * where the mark rests, derived from the arc count rather than written as a
 * bare 120, so it keeps landing the mark back on itself if the number of
 * arcs ever changes. It is negative because the mark finishes unturned and
 * the animation only supplies its beginning: travelling from -120 up to 0
 * sweeps clockwise, which is the direction a recycling mark turns.
 */
export const TURN_START_ANGLE_DEGREES = -360 / ARC_COUNT;

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
export function arcPath(startDegrees: number): string {
  const start = pointAtAngle(startDegrees);
  const end = pointAtAngle(startDegrees + ARC_SPAN_DEGREES);
  return `M ${formatPoint(start)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${formatPoint(end)}`;
}

/**
 * An arrowhead at an arc's leading (clockwise) end, continuing the arc's own
 * curve: a triangle whose tip sits past the endpoint along the arc's tangent
 * there, and whose base straddles the endpoint across the tangent.
 */
export function arrowheadPoints(endDegrees: number): string {
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

/** The three arcs' start angles, evenly spaced (steal.md §10, RotatorMarker.tsx). */
export const ARC_START_ANGLES: readonly number[] = Array.from(
  { length: ARC_COUNT },
  (_, index) => index * SLOT_DEGREES,
);
