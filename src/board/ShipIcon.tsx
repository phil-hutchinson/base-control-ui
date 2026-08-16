// Decorative ship artwork. The two sides get outlines that differ in shape,
// not only in colour, so they stay tellable apart in greyscale: green is a
// pointed dart with a concave notch at the rear, red is a rounded hexagonal
// hull. Purely decorative - a screen reader gets the ship from the occupying
// square's accessible name (see squareLabel.ts), so the SVG carries no title
// or description and is hidden from the accessibility tree.

import type { Side } from "../rules/fleet";

interface ShipIconProps {
  readonly side: Side;
}

// Both silhouettes sit inside a 100 x 100 viewBox with roughly 70% of the
// square filled and every corner left clear for a future shield count.
const SHAPES: Record<Side, string> = {
  green: "M50,15 L85,79 L50,61 L15,79 Z",
  red: "M50,15 L80.3,32.5 L80.3,67.5 L50,85 L19.7,67.5 L19.7,32.5 Z",
};

export function ShipIcon({ side }: ShipIconProps) {
  return (
    <svg
      className={`ship-icon ship-icon--${side}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d={SHAPES[side]}
        fill="currentColor"
        stroke="var(--color-space)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
