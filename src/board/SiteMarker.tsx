// Decorative site-state artwork: a ring inscribed close to the square's
// edge, drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Round rather than square so a site reads as a
// different kind of marker from the square bay border in Board.css. Purely
// decorative - a screen reader gets the site and its state from the
// occupying square's accessible name (see squareLabel.ts), so the SVG
// carries no title or description and is hidden from the accessibility
// tree.

import type { SiteState } from "../rules/sites";
import "./SiteMarker.css";

interface SiteMarkerProps {
  readonly state: SiteState;
}

interface RingSpec {
  readonly radius: number;
  readonly strokeWidth: number;
  readonly dasharray?: string;
}

// A 100 x 100 viewBox centred at (50, 50), matching ShipIcon's. Radius 47
// clears both ship silhouettes, which reach at most ~45.5% of the square, at
// worst touching them at two tangent points. The four states differ in ring
// line treatment and weight before colour - dotted, solid, double and
// dashed - so they stay distinct in greyscale, not only by hue.
const RING_SPECS: Record<SiteState, readonly RingSpec[]> = {
  dormant: [{ radius: 47, strokeWidth: 1.5, dasharray: "1 4" }],
  active: [{ radius: 47, strokeWidth: 3 }],
  charged: [
    { radius: 47, strokeWidth: 4 },
    { radius: 39, strokeWidth: 4 },
  ],
  depleted: [{ radius: 47, strokeWidth: 3, dasharray: "8 5" }],
};

export function SiteMarker({ state }: SiteMarkerProps) {
  return (
    <svg
      className={`site-marker site-marker--${state}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle className="site-marker__fill" cx={50} cy={50} r={47} />
      {RING_SPECS[state].map((ring) => (
        <circle
          key={ring.radius}
          className="site-marker__ring"
          cx={50}
          cy={50}
          r={ring.radius}
          strokeWidth={ring.strokeWidth}
          strokeDasharray={ring.dasharray}
        />
      ))}
    </svg>
  );
}
