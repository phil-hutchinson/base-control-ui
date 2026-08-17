// Decorative ship artwork. The two sides get outlines that differ in shape,
// not only in colour, so they stay tellable apart in greyscale: green is a
// pointed dart with a concave notch at the rear, red is a rounded hexagonal
// hull. Purely decorative - a screen reader gets the ship, and its shield
// count, from the occupying square's accessible name (see squareLabel.ts), so
// the SVG carries no title or description and is hidden from the
// accessibility tree.
//
// A shield ring is drawn around the hull as up to four 90-degree arcs, one
// per lit position from shieldArcs.ts, each the ship's own colour and
// separated from its neighbours by a visible gap. The hull is scaled down
// from its original size so the ring has room to sit outside it without
// reaching the edge of the square.

import type { Side } from "../rules/fleet";
import type { ShieldCount } from "../rules/shields";
import { litArcPositions, type ArcPosition } from "./shieldArcs";
import "./ShipIcon.css";

interface ShipIconProps {
  readonly side: Side;
  readonly shields: ShieldCount;
}

// Both silhouettes are defined at their original, full size and shrunk by
// HULL_SCALE (below) to make room for the shield ring around them.
const SHAPES: Record<Side, string> = {
  green: "M50,15 L85,79 L50,61 L15,79 Z",
  red: "M50,15 L80.3,32.5 L80.3,67.5 L50,85 L19.7,67.5 L19.7,32.5 Z",
};

const VIEWBOX_CENTRE = 50;

// The shield ring's geometry. The four values are interdependent: a thicker
// stroke wants a smaller hull, a wider gap wants a shorter visible arc.
/** Distance from the viewBox centre to the middle of the ring, in viewBox units. */
const RING_RADIUS = 42;
/** Thickness of the ring's stroke, in viewBox units. */
const RING_STROKE_WIDTH = 8;
/** Angular gap, in degrees, separating each arc from its neighbours. */
const ARC_GAP_DEGREES = 14;
/** Factor the hull silhouette is scaled by, about the viewBox centre. */
const HULL_SCALE = 0.72;

const ARC_SWEEP_DEGREES = 90 - ARC_GAP_DEGREES;

/**
 * Which 90-degree quadrant (0 = top-right, clockwise) each arc position
 * draws in. Exhaustive over `ArcPosition`, so a new position is a compile
 * error here rather than a silent gap in the ring.
 */
const ARC_QUADRANT: Record<ArcPosition, number> = {
  "top-right": 0,
  "bottom-right": 1,
  "bottom-left": 2,
  "top-left": 3,
};

/** A point on a circle, at `angleDegrees` clockwise from the top. */
function pointOnCircle(radius: number, angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: VIEWBOX_CENTRE + radius * Math.sin(angleRadians),
    y: VIEWBOX_CENTRE - radius * Math.cos(angleRadians),
  };
}

/** The `d` attribute for a single quarter-circle arc, shortened at both ends. */
function arcPath(quadrantIndex: number): string {
  const quadrantStart = quadrantIndex * 90 + ARC_GAP_DEGREES / 2;
  const quadrantEnd = quadrantStart + ARC_SWEEP_DEGREES;
  const start = pointOnCircle(RING_RADIUS, quadrantStart);
  const end = pointOnCircle(RING_RADIUS, quadrantEnd);
  return `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

export function ShipIcon({ side, shields }: ShipIconProps) {
  return (
    <svg
      className={`ship-icon ship-icon--${side}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g
        transform={`translate(${VIEWBOX_CENTRE} ${VIEWBOX_CENTRE}) scale(${HULL_SCALE}) translate(${-VIEWBOX_CENTRE} ${-VIEWBOX_CENTRE})`}
      >
        <path
          d={SHAPES[side]}
          fill="currentColor"
          stroke="var(--color-space)"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </g>
      {litArcPositions(shields).map((position) => (
        <path
          key={position}
          data-arc-position={position}
          d={arcPath(ARC_QUADRANT[position])}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE_WIDTH}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}
